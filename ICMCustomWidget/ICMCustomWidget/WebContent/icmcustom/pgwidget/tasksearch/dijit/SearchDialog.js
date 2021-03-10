define([ 
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-class",
	"dojo/aspect",
	"dojo/sniff",
	"dojo/text!./templates/SearchDialogPane.html",
	"ecm/LoggerMixin",
	"ecm/widget/FilteringSelect",
	"dojo/data/ItemFileWriteStore",
	"icm/base/_BaseWidget", 
	"ecm/model/AttributeDefinition",
	"ecm/model/Request",
	"ecm/widget/SinglePropertyEditorFactory",
	"icm/pgwidget/casesearch/dijit/SearchAttributeDefinitionWidget",
	"dojox/uuid/generateRandomUuid",
	"ecm/widget/DatePicker",
	"icm/util/SearchUtil",
	"ecm/widget/dialog/BaseDialog"
	],

	function(declare, 
			lang, 
			domClass, 
			aspect,
			sniff,
			template,
			LoggerMixin, 
			FilteringSelect, 
			ItemFileWriteStore, 
			BaseWidget, 
			AttributeDefinition, 
			Request, 
			SinglePropertyEditorFactory, 
			SearchAttributeDefinitionWidget, 
			generateRandomUuid, 
			DatePicker,
			SearchUtil,
			BaseDialog) {


	return declare("icmcustom.pgwidget.tasksearch.dijit.SearchDialogPane", [BaseDialog], {
		contentString: template,

		widgetsInTemplate: true,

		constructor: function(/*Object*/args){
			this.resourceBundle = icm.util.Util.getResourceBundle("casesearch");
			
			this._searchUtil = new SearchUtil();

			this._objectStoreName = args.objectStoreName;
			this._objectStoreType = args.objectStoreType;

			this._caseTypeName = "all";
		
			this.logDebug("SearchDialogPane.constructor", "parameters", {
				objectStoreName: this._objectStoreName, 
				solutionName: this._solutionName});

			this._inputFields = {
				"wellknown": [],
				"case": []
			};
			this._userCriteriaWidgets = [];
			this._inputIntervalFields = {
				"wellknown": [],
				"case": [],
				"more": []
			};

			this._searchCallback = args.searchCallback;
			this._searchDefinition = {};
			this._attributeDefinitions = {};
			this._userSpecifiedAttDefs = {};
			this._solution = args.solution;
			this._role = args.role;
			this.wellknownProperties = args.wellknownProperties;
			this.searchViewPropDefs = args.searchViewPropDefs;
			this.allSearchablePropDefs = args.allSearchablePropDefs;
			this.isShowUserSpecified = args.isShowUserSpecified;
			this.isShowAllProperties = args.isShowAllProperties;
			this.repository = this._solution.getTargetOS();
			this._factory = new SinglePropertyEditorFactory();
		},

		postCreate: function(){
			this.logEntry("Case SearchDialogPane postCreate");
			this.inherited(arguments);
			this.setMaximized(false);
			this.setResizable(true);
			
			this.searchButton = this.addButton(this.resourceBundle.searchButtonLabel, "onSearch", true, false, "SEARCH");
			this.setTitle(this.resourceBundle.advancedSearch);
			this.setWidth(600);
			
			this.connect(this.domNode, "onkeypress", "_onKeyPress");

			if(!this.isShowUserSpecified) {
				this.userCriteriaSection.style.display = "none";
			}
			this._retrieveBaseAttributeDefinitions();
			this.logExit("Case SearchDialogPane postCreate");

		},
		
		_onKeyPress: function(evt){
			if(evt.keyCode == dojo.keys.ENTER){
				dojo.stopEvent(evt);
			}
		},

		_retrieveBaseAttributeDefinitions: function() {			
			var i;
			
			this._attributeDefinitions["default"] = [];
			for(i = 0; i < this.wellknownProperties.length; i++) {
				var name = this.wellknownProperties[i].name;
				var attDef = this._searchUtil.getAttributeDefinitionByID(this.allSearchablePropDefs, name);
				var attDefNew = attDef;//.clone();
				if(attDefNew) {
					if(this.wellknownProperties[i].excludedValues && attDefNew.choiceList && attDefNew.choiceList.choices) {						
						var newChoices = [];
						var k, j;
						var excludedValues = this.wellknownProperties[i].excludedValues;
						for(k = 0; k < attDefNew.choiceList.choices.length; k++) {
							var choice = attDefNew.choiceList.choices[k];
							var isInclude = true;
							for(j = 0; j < excludedValues.length; j++) {
								if (excludedValues[j] == choice.value)
								{
									isInclude = false;
								}
							}
							if(isInclude) {
								newChoices.push(choice);
							}
						}
						attDefNew.choiceList.choices = newChoices;
					}
					// 5 default system properties, if there's no search view
					attDefNew.interval = this.wellknownProperties[i].interval ? true : false;
					this._attributeDefinitions["default"].push(attDefNew);
				}
			}
			
			for(i = 0; i < this.searchViewPropDefs.length; i++) {
				var multiValue = this.searchViewPropDefs[i].cardinality.toLowerCase() != "single";
				this.searchViewPropDefs[i].interval = !multiValue && (this.searchViewPropDefs[i].dataType == "xs:timestamp");				
			}
						
			this._addCaseTypeField();
			this._addMatchCriteriaField();
			this._addCrossCaseTypePropertyFields();
			//Trigger resize event
			this.onResize();


					
		},

		_createSearchSelector: function() {
			this.contentClassSelector.defaultToFirstItem = true;
			this.contentClassSelector.allowMultipleClasses = true;
			this.contentClassSelector.setRepository(this.repository);
			this.contentClassSelector.setRootClassId("CmAcmCaseFolder");
			this.contentClassSelector.setShowIncludeSubclasses(false);
		},
				
		onResize: function(){
			
		},
		
		onSearch: function(){
			this.logEntry("Case SearchDialogPane onSearch");
			if(!this._searchCallback){ return; }

			this._searchDefinition.objectStoreName = this._objectStoreName;
			this._searchDefinition.anyCriteria = this._matchCriteriaInputField.attr("value") == "any";
			var caseType = this._caseTypeName;
			if(caseType == "all"){ caseType = ""; }
			this._searchDefinition.caseType = caseType;
			this._searchDefinition.searchCriteria = {};

			var criterion = [];
			dojo.forEach(this._inputFields["case"], function(w, i){
				if(this._isWidgetValueSet(w)){
					var criteria = this.createCriterion(w, i, "case");
					criterion = criterion.concat(criteria);
				}
			}, this);

			dojo.forEach(this._inputFields["wellknown"], function(w, i){
				if(this._isWidgetValueSet(w)){
					var criteria = this.createCriterion(w, i, "wellknown");
					criterion = criterion.concat(criteria);
				}
			}, this);
			
			dojo.forEach(this._userCriteriaWidgets, function(w, i){
				if(this._isWidgetValueSet(w) || w._operator == "NULL" || w._operator == "NOTNULL"){
					var criteria = this.createCriterion(w, i, "more");
					criterion = criterion.concat(criteria);
				}
			}, this);
			
			this._searchDefinition.searchCriteria.criterion = criterion;
			this._searchCallback(this._searchDefinition);
			this.logExit("Case SearchDialogPane onSearch");
		},

		_isWidgetValueSet: function(/*dijit._Widget*/widget){
			if(!widget){ return false; }

			var value = widget.getValue();
			var attDef = widget.attributeDefinition;

			var set = false;
			var dataType = attDef.dataType;

			if(dataType == this._searchUtil.PROPERTY_TYPE.BOOLEAN && typeof value == "string"){
				value = dojo.trim(value);
			}
			if(value && value.length > 0){ set = true; }
			if(!set
				&& (dataType == this._searchUtil.PROPERTY_TYPE.INTEGER || dataType == this._searchUtil.PROPERTY_TYPE.DECIMAL)
				&& !isNaN(parseInt(value, 10))){
				set = true;
			}
			if(!set && dataType == this._searchUtil.PROPERTY_TYPE.BOOLEAN && typeof value == "boolean"){
				set = true;
			}
			if(value && value.declaredClass == "ecm.model.User" && value.shortName) {
				set = true;
			}

			return set;
		},

		createCriterion: function(/*dijit._Widget*/widget, /*Integer*/index, /*String*/prefix) {
			this.logEntry("Case SearchDialogPane createCriterion");
			var criterions = [], i;
			var searchConfig = ecm.model.SearchConfiguration.getSearchConfiguration({
				repository: this.repository
			});
		
			var attDef = widget.attributeDefinition;
			
			if(attDef.dataType == "xs:float") {
				attDef.setDataType(this._searchUtil.PROPERTY_TYPE.DECIMAL);
			} else if (attDef.dataType == "xs:datetime") {
				attDef.setDataType("xs:timestamp");
			}									
		
			var operators = searchConfig.getOperators(attDef.dataType, attDef.cardinality, attDef.choiceList, attDef.textSearchable, attDef.nullable, attDef.usesLongColumn);
			var format = attDef.format;
			if (attDef.dataType == "xs:timestamp") {
				// Time is not pertinent to search; use the date format instead 
				format = ecm.model.desktop.valueFormatter.getDefaultFormat("xs:date");
			}
					
			var multiValue = attDef.cardinality.toLowerCase() != "single";
			
			var selectedOperator = this._searchUtil.OPERATOR.EQ;
			if(dojo.isFunction(widget.getOperator)) {
				selectedOperator = widget.getOperator();
			} else {
				selectedOperator = multiValue ? this._searchUtil.OPERATOR.IN: this._searchUtil.OPERATOR.EQ;
			}
			
			if(this._inputIntervalFields[prefix][index]){
				//for datetime type, it has interval field
				var secondWidget = this._inputIntervalFields[prefix][index];
				var values = [widget.getValue(), secondWidget.getValue()];
				selectedOperator = this._searchUtil.OPERATOR.BETWEEN;
				values = this._convertDateValue(attDef, values, selectedOperator, true);			
				var criterion1 = this._searchUtil.createSearchCriterionModel(attDef, format, operators, selectedOperator, values)
				criterions.push(criterion1);
	        }else{
			    var selectedOperator = selectedOperator;
				var values = dojo.isFunction(widget.getValueAsArray) ? widget.getValueAsArray() : this._getFormattedValues(attDef, widget, multiValue, selectedOperator);
				values = this._convertDateValue(attDef, values, selectedOperator, false);
				var criterion = this._searchUtil.createSearchCriterionModel(attDef, format, operators, selectedOperator, values)

				criterions.push(criterion);
			}
			this.logExit("Case SearchDialogPane createCriterion", criterions);
			return criterions;
		},

		_getFormattedValues: function(attDef, widget, multiValue, operator) {
			var value;
			if(widget._multiValued || multiValue || operator == "BETWEEN" || operator == "NOTBETWEEN") {
				value = widget.getValues() || widget.getValue();
			} else {
				value = widget.getValue();
			}
			if(dojo.isArray(value) && value.length > 0) {
				//User property in Wellknown field or multiple properties
				 if (this._searchUtil.isUserProperty(attDef.id)) {
					return value;
				 }
				for(i = 0; i < value.length; i++) {
					value[i] = "" + value[i];
				}	
				return value;
			}
			var values = []
			if(value) {
				values.push(value);
			} else {
				values = [ "", "" ];
			}
			return values;
		},

		_convertDateValue: function(attDef, values,  selectedOperator, isInterval) {
			var dataType = attDef.dataType;
			var multiValue = attDef.cardinality.toLowerCase() != "single";
	
			if(dataType == "xs:timestamp" && multiValue) {
				if(this._searchUtil.isInArray(this._searchUtil.MIDDAY_OPERATORS, selectedOperator)) {
					for(i = 0; i < values.length; i++) {
						if (values[i]) {
							values[i] = "" + values[i];
						}
					}	
				} 
			}					
			return values;
		},

		

		_addDateValue: function(dateValue) {
			var newDate = dojo.date.add(new Date(dateValue), "day", 1);
			var newValue;
			if(newDate.getFullYear() > 9999) {
				newValue = this.LARGEST_DATE_VALUE;
			} else {
				newValue = dojo.date.stamp.toISOString(newDate, {milliseconds: true, zulu: true});
			}
			return newValue;
		},

		_callback: function(){
			if(!this._searchCallback || !this._criteriaDefined) { return; }

			this._searchCallback(this._searchDefinition);
		},

		onCaseTypeChange: function(/*String*/value){
			this.logEntry("Case SearchDialogPane onCaseTypeChange");
			if(this._caseTypeName == value){ return; }

			this._caseTypeName = value;

			this._destroyWidgets(this._inputFields["case"]);
			this._destroyWidgets(this._inputIntervalFields["case"]);
			this._destroyWidgets(this._inputFields["wellknown"]);
			this._destroyWidgets(this._inputIntervalFields["wellknown"]);

			this._destroyWidgets(this._userCriteriaWidgets);
			this._inputFields["case"] = [];
			this._inputIntervalFields["case"] = [];
			this._inputFields["wellknown"] = [];
			this._inputIntervalFields["wellknown"] = [];
			this._userCriteriaWidgets = [];
			dojo.empty(this.caseCriteriaNode);
			dojo.empty(this.wellKnownCriteriaNode);

			this._caseType = this._solution.getCaseType(value);

			if(this._caseType) {
				this._addCasePropertyFields();
			} else {
				this._addCrossCaseTypePropertyFields();
			}
			this.logExit("Case SearchDialogPane onCaseTypeChange");
		},

		_addCaseTypeField: function(){
			var typeStore = new ItemFileWriteStore({
				data: {
					identifier: "id",
					label: "name",
					items: [ {
						id: "all",
						name: this.resourceBundle.all
					} ]
				}
			});

			var id = (new Date()).getTime() + "caseTypeInputField";	
			dojo.attr(this.caseTypeInputFieldLabel, "for", id);
			this._caseTypeInputField = new FilteringSelect({
				id: id,
				name: "caseTypeInputField",
				value: "all",
				required: true,
				store: typeStore,
				searchAttr: "name",
				style: {
					width: "200px"
				},
				onChange: dojo.hitch(this, this.onCaseTypeChange)
			});
			
			this.connect(this._caseTypeInputField, "validate", dojo.hitch(this, this._onValidate));
			this._caseTypeInputField.placeAt(this.caseTypeInputField);
			this._caseTypeInputField.startup();

			this._solution.retrieveCaseTypes(dojo.hitch(this, this._addCaseTypes));
		},

		_addCaseTypes: function(caseTypes){
			if(!caseTypes){ return; }
			
			//the display order of the caseTypes is the alphabetical order
			caseTypes.sort(function(a, b){
				return a.name < b.name ? -1 : 1;
			});
					
			var exists = false;
			dojo.forEach(caseTypes, function(type){
				this._caseTypeInputField.store.newItem({
					id: type.id,
					name: type.name
				});
				if(type.id == this._caseTypeName){ exists = true; }
			}, this);

			if(exists){ this._caseTypeInputField.attr("value", this._caseTypeName); }
		},

		_addMatchCriteriaField: function(){     
			var time = (new Date()).getTime();          
			this._matchCriteriaInputField = new FilteringSelect({
				id: "matchCriteriaInputField"+time,
				name: "matchCriteriaInputField",
				required: true,
				value: "all",
				searchAttr: "label",
				style: {
					width: "200px"
				},
				store: this._getMatchConditionsStore(),
				sortByLabel: false
			});
			dojo.attr(this.matchCriteriaInputFieldLabel, "for", "matchCriteriaInputField"+time);
			this._matchCriteriaInputField.placeAt(this.matchCriteriaInputField);
			this._matchCriteriaInputField.startup();
		},

		_getMatchConditionsStore: function(){
			return new ItemFileWriteStore({
				data: {
					identifier: "value",
					label: "label",
					items: [
						{ value: "all", label: this.resourceBundle["all"] },
						{ value: "any", label: this.resourceBundle["any"] }
					]
				}
			});
		},

		_addCasePropertyFields: function(){
			if(this._attributeDefinitions[this._caseTypeName]) {
				this._addCasePropertyFieldsByAttDefs(this._attributeDefinitions[this._caseTypeName]);
			} else {
				this._caseType.retrieveAttributeDefinitions(dojo.hitch(this, this._addCasePropertyFieldsDeferred));
			}
		},

		_addCasePropertyFieldsDeferred: function(/*AttributeDefinition[]*/attributeDefinitions){
			var searchViewProperties, i;
			this._attributeDefinitions[this._caseTypeName] = [];
			
			var i;
			if(this.isShowAllProperties) {				
				this._userSpecifiedAttDefs[this._caseTypeName] = [];
				for(i = 0; i < attributeDefinitions.length; i++) {
					if(attributeDefinitions[i].searchable && !attributeDefinitions[i].hidden && attributeDefinitions[i].dataType !=	"xs:object" && !this._searchUtil.isInArray(this._searchUtil.ignoredProperties, attributeDefinitions[i].id, "id")) {
						var multiValue = attributeDefinitions[i].cardinality.toLowerCase() != "single";
						attributeDefinitions[i].interval = !multiValue && (attributeDefinitions[i].dataType == "xs:timestamp");	
						this._userSpecifiedAttDefs[this._caseTypeName].push(attributeDefinitions[i]);
					}
				}
						
				if(this._userSpecifiedAttDefs[this._caseTypeName].length > 1) {
					//the display order of the properties is the alphabetical order
					this._userSpecifiedAttDefs[this._caseTypeName].sort(function(a, b){
						return a.name < b.name ? -1 : 1;
					});
				}
			}
			searchViewProperties = this._getSearchViewPropertyNames(this._caseType);
			for(i = 0; i < searchViewProperties.length; i++){
				var name = searchViewProperties[i]; 
				var attDef = this._searchUtil.getAttributeDefinitionByID(attributeDefinitions, name);
				if(attDef) {
					var multiValue = attDef.cardinality.toLowerCase() != "single";
					attDef.interval = !multiValue && (attDef.dataType == "xs:timestamp");

					var k;
					for (k = 0; k < icmglobal.wellKnownProperties.searchExceptionProperties.length; k++)
					{
						if(attDef.id == icmglobal.wellKnownProperties.searchExceptionProperties[k].name) {
							if(icmglobal.wellKnownProperties.searchExceptionProperties[k].excludedValues && attDef.choiceList && attDef.choiceList.choices) {						
								var newChoices = [];
								var m, n;
								var excludedValues = icmglobal.wellKnownProperties.searchExceptionProperties[k].excludedValues;
								for(m = 0; m < attDef.choiceList.choices.length; m++) {
									var choice = attDef.choiceList.choices[m];
									var isInclude = true;
									for(n = 0; n < excludedValues.length; n++) {
										if (excludedValues[n] == choice.value)
										{
											isInclude = false;
										}
									}
									if(isInclude) {
										newChoices.push(choice);
									}
								}
								attDef.choiceList.choices = newChoices;
							}
						}
					}

					this._attributeDefinitions[this._caseTypeName].push(attDef);					
				}
			}	
			if(this._attributeDefinitions[this._caseTypeName].length == 0) {
				this._attributeDefinitions[this._caseTypeName] = this._attributeDefinitions["default"];
			}
			this._addCasePropertyFieldsByAttDefs(this._attributeDefinitions[this._caseTypeName]);
		},
		
		_addCasePropertyFieldsByAttDefs: function(/*AttributeDefinition[]*/attributeDefinitions) {
			dojo.forEach(attributeDefinitions, function(attDef, index){
				this._appendPropertyField(attDef, index, "case", this.caseCriteriaNode);
			}, this);
		},
		
		/*
		*If there are any Search Views in the solution, then create union of properties from all Search Views, eliminating duplicates.
		* If no Search Views exist in the solution then show pre-defined properties in order that we did in 5.1.1.
		*/
		_addCrossCaseTypePropertyFields: function(){
			var wellKnownAttDefs = [];
			var attDefs = this.searchViewPropDefs.length > 0 ? this.searchViewPropDefs : this._attributeDefinitions["default"];
			dojo.forEach(attDefs, function(attDef, index){
				this._appendPropertyField(attDef, index, "wellknown", this.wellKnownCriteriaNode);
			}, this);
		},

		

		_appendPropertyField: function(/*AttributeDefinition*/attDef, /*Integer*/index, /*String*/prefix, /*DomNode*/node){
			var label = attDef.name;
			if(attDef.cardinality.toLowerCase() == "multi"){
				label = dojo.string.substitute(this.resourceBundle.labelIncludes, {"label": label});
			}else if(attDef.interval){
				label = this.resourceBundle[label]||label;
			}
			
			label = dojo.string.substitute(this.resourceBundle.labelColon, {"label": label});
			var inputId = prefix + this._solution.getPrefix() + this._role.id + index + (new Date()).getTime();
			
			if(attDef.interval){
				this._appendLabelNode(label, inputId+"_N", node);
				this._appendA11YLabelNode(label + " " + this.resourceBundle.labelFrom, inputId, node);
			}else{
				this._appendLabelNode(label, inputId, node);
			}

			this._inputFields[prefix][index] = this._appendInputField(attDef, inputId, node);

			if(attDef.interval){
				dojo.create("label", {
					"for": inputId+"_N",
					innerHTML: "&nbsp;" + this.resourceBundle.and + "&nbsp;"
				}, node);           
				this._appendA11YLabelNode(label + " " + this.resourceBundle.labelTo, inputId + "interval", node);
				this._inputIntervalFields[prefix][index] = this._appendInputField(attDef, inputId + "interval", node);
			}
		},

		_appendInputField: function(/*AttributeDefinition*/attDef, /*String*/inputId, /*DomNode*/node){
			
			var preferTextBoxForNumbers = false;
			if (sniff("ios")) {
				if (attDef.dataType == "xs:decimal" || attDef.dataType == "xs:double" ||
					attDef.dataType == "xs:integer") 
					preferTextBoxForNumbers = true;
			}
			var field = this._searchUtil.createSearchInputField(attDef, inputId, this._getInputAreaWidth(attDef), this.repository, false, false, preferTextBoxForNumbers);
			field.attributeDefinition = attDef;
			node.appendChild(field.domNode);
			this.connect(field, "validate", dojo.hitch(this, this._onValidate));
			return field;
		},

		_onValidate: function(){
			
			var isValid = true;
			var isEmpty = true;
			dojo.forEach(this._inputFields["case"], function(w, i){
				if(w.state == "Error") {
					isValid = false;
					return;
				}
				if(this._isWidgetValueSet(w)){
					isEmpty = false;	
					return;
				}
			}, this);

			dojo.forEach(this._inputIntervalFields["case"], function(w, i){
				if(w && w.state == "Error") {
					isValid = false;
					return;
				}
				if(w && this._isWidgetValueSet(w)){
					isEmpty = false;	
					return;
				}
			}, this);

			dojo.forEach(this._inputFields["wellknown"], function(w, i){
				if(w.state == "Error") {
					isValid = false;
					return;
				}
				if(this._isWidgetValueSet(w)){
					isEmpty = false;
					return;
				}					
			}, this);

			dojo.forEach(this._inputIntervalFields["wellknown"], function(w, i){
				if(w && w.state == "Error") {
					isValid = false;
					return;
				}
				if(w && this._isWidgetValueSet(w)){
					isEmpty = false;	
					return;
				}
			}, this);
			
			dojo.forEach(this._userCriteriaWidgets, function(w, i){
				
				var fields = w.getFields();
				var valid = false;
				dojo.forEach(fields, function(field, i){
					if(field.hidden) {
						//this field is hidden, we don't verify it
						return;
					}
					if(field.isValid()){
						valid = true;
					}					
				}, this);
				isValid = valid;
				if(this._isWidgetValueSet(w)){
					isEmpty = false;					
				}
				if(w._operator == "NULL" || w._operator == "NOTNULL") {
					isValid = true;
					isEmpty = false;	
				}
			}, this);
			
			var isDisabled = (!isEmpty && isValid) ? false : true;
			this.searchButton.attr("disabled", isDisabled);
		},

		_appendLabelNode: function(/*String*/label, /*String*/inputId, /*DomNode*/node, /*Boolean*/hide){
			var div = dojo.create("div", {
				"class": "fieldLabel"
			}, node);
			if(hide){ dojo.style(div, "display", "none"); }
			label = dojo.create("label", {
				"for": inputId,
				innerHTML: label
			}, div);
		},
		
		_appendA11YLabelNode: function(/*String*/label, /*String*/inputId, /*DomNode*/node){
			var div = dojo.create("div", {
				"class": "fieldLabel"
			}, node);
			dojo.style(div, "display", "block");
			dojo.style(div, "position", "fixed");
			dojo.style(div, "left", "-5000px");         
			label = dojo.create("label", {
				"for": inputId,
				innerHTML: label
			}, div);
		},

		

		/*
		*   --------------------------------------------------------------------------------------------------
		*   |                   |         show all properties	                |  don't show all properties  |
		*   |-------------------------------------------------------------------------------------------------
		*   |cross case types   |system properties in CmAcmCaseFolder -         |The union of the search view |
		*   |                   |hidden/object/filter out properties +          |properties                   |
		*   |                   |all user defined properties for this solution  |                             |
		*   |-------------------------------------------------------------------------------------------------
		*   |select a case type |system properties in CmAcmCaseFolder -         |The search view properties in|
		*   |                   |hidden/object/filter out properties +          |this  case type              |
		*   |                   |all user defined properties for this case type |                             |
		*   |-------------------------------------------------------------------------------------------------
		*/
		_onAdd: function() {
			
			
			var w = new SearchAttributeDefinitionWidget({
				repository: this.repository,
				criterion: null
			});

			aspect.after(w, "setValues", lang.hitch(this, this._onValidate), true);
			aspect.after(w, "setOperator", lang.hitch(this, this._onValidate), true);
			
			var attDefs;
			if(this.isShowAllProperties && this._caseTypeName == "all") {
				attDefs = this.allSearchablePropDefs;
			} else if(this.isShowAllProperties && this._caseTypeName != "all") {
				attDefs = this._userSpecifiedAttDefs[this._caseTypeName];
			} else if (!this.isShowAllProperties && this._caseTypeName == "all") {
				attDefs = this.searchViewPropDefs;
			} else {
				var attDefs = this._attributeDefinitions[this._caseTypeName];
			}			
			if(attDefs.length == 0) {
				attDefs = this._attributeDefinitions["default"];
			}
			var searchConfig = ecm.model.SearchConfiguration.getSearchConfiguration({
				repository: this.repository
			});
			for(var i = 0; i < attDefs.length; i++) {
				attDefs[i].availableOperators = searchConfig.getOperators(attDefs[i].dataType, attDefs[i].cardinality, attDefs[i].choiceList, attDefs[i].textSearchable, attDefs[i].nullable, attDefs[i].usesLongColumn);
			}
			w.setAttributeDefinition(attDefs, attDefs[0]);
			w.region = "top";

			this._setUpControlButtons(w);
			this.userCriteria.appendChild(w.domNode);
			this._userCriteriaWidgets.push(w);
		},

		_getSearchViewPropertyNames: function(caseType) {
			var names = [];
			var i, j, fields;
			if(caseType) {
				fields = caseType.getSearchView() ? caseType.getSearchView().fields : [];
				for(i = 0; i < fields.length; i++) {
					names.push(fields[i].name);
				}
			} else {
				var caseTypes = this._solution.getCaseTypes();
				for (i = 0; i < caseTypes.length ; i++ )
				{
					var type = caseTypes[i];
					fields = type.getSearchView() ? type.getSearchView().fields : [];
					for(j = 0; j < fields.length; j++) {
						if(!this._searchUtil.isInArray(names, fields[j].name)) {
							names.push(fields[j].name);
						}	
					}
				}
			}
			return names;
		},

		_setUpControlButtons: function(wid) {
			var self = this;
			//Need to deprecate dojo.connect and replace with newer API
			dojo.connect(wid.domNode, "onmouseover", function() {
				domClass.add(wid.domNode, "attributeDefintionWidgetHover");
				domClass.remove(wid.controlButtons, "controlButtonsHidden");
			});

			dojo.connect(wid.domNode, "onmouseout", function() {
				domClass.remove(wid.domNode, "attributeDefintionWidgetHover");
				domClass.add(wid.controlButtons, "controlButtonsHidden");
			});

			dojo.connect(wid.removeNode, "onclick", function() {
				self._removeWidget(wid);
			});
		},

		_getInputAreaWidth: function(attDef) {
			var width = "200px";
			if(this._searchUtil.isUserProperty(attDef.id)) {
				width = "168px";
			} else if(attDef.cardinality.toLowerCase() != "single") {
				width = "168px";
			}
			return width;
		},
		
		_removeWidget: function(wid) {
			var i, isDisabled = false;
			for(i = 0; i < this._userCriteriaWidgets.length; i++) {
				if(this._userCriteriaWidgets[i] == wid) {
					this._userCriteriaWidgets.splice(i, 1);
					break;
				}
			}
			this.userCriteria.removeChild(wid.domNode);
			this._destroyWidgets(wid);
			this._onValidate();
		},

		destroy: function(){
			this._caseTypeInputField.destroyRecursive();
			this._destroyWidgets(this._inputFields["wellknown"]);
			this._destroyWidgets(this._inputFields["case"]);
			this._destroyWidgets(this._inputIntervalFields["wellknown"]);
			this._destroyWidgets(this._inputIntervalFields["case"]);
			this._destroyWidgets(this._inlineMessages);

			this.inherited(arguments);
		},
		
		hide: function() {
			//restore the dialog before close it. So when user opens it next time, 
			//the dialog is not maximized. 
			this._onRestore();
			this.inherited(arguments);
		},

		_destroyWidgets: function(/*dijit._Widget[]*/widgets){
			dojo.forEach(widgets, function(w){
				if(w && w.destroyRecursive){
					w.destroyRecursive();
				}else if(w && w.destroy){
					w.destroy();
				}
			});
		}
	
	});
});
