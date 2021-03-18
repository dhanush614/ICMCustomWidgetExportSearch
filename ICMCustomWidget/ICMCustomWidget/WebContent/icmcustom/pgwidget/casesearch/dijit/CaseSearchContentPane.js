/**
 * Licensed Materials - Property of IBM
 * (C) Copyright IBM Corp. 2010, 2018
 * US Government Users Restricted Rights - Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 */
define([ "dojo/text!./templates/CaseSearchContentPane.html",
         "dojo/sniff",
         "dojo/_base/declare",
         "dojo/_base/lang",
         "dojo/dom-class",
	 	 "dojo/dom-style",
         "dojo/keys",
         "dojo/string",
		 "dojo/aspect",
		 "dojo/on",
         "dojo/data/ItemFileReadStore",
		 "dijit/form/Button",
         "icm/base/_BaseWidget",
         "dojo/date/stamp",
         "dojo/date",
		 "dojox/data/dom",
         "ecm/widget/FilteringSelect",
		 "ecm/model/AttributeDefinition",
		 "icm/util/SearchUtil",
		 "icmcustom/pgwidget/casesearch/dijit/SearchDialog",
		 "idx/widget/Dialog"
         ],

         function(template, 
        		 sniff,
        		 declare, 
        		 lang, 
        		 domClass,
				 domStyle,
        		 keys, 
        		 string, 
				 aspect,
				 on,
        		 ItemFileReadStore,
				 idxButton,
        		 _BaseWidget, 
        		 stamp, 
        		 date, 
        		 dom, 
        		 FilteringSelect, 
        		 AttributeDefinition,
				 SearchUtil,
				 SearchDialog,
				 Dialog 	       
        		 ) {

		 /**
		  * @private
		  * @name icm.pgwidget.casesearch.dijit.CaseSearchContentPane
		  * @class Provides a widget that is used to render a Case search form 
		  * @augments dijit._Widget
		  */
		 return declare("icmcustom.pgwidget.casesearch.dijit.CaseSearchContentPane", [ _BaseWidget], /** @lends icm.pgwidget.casesearch.dijit.CaseSearchContentPane.prototype */ {
			 widgetsInTemplate: true,
		 	 templateString: template,
		 	 
		 	
			
			DEFAULT_FIRST_PROPERTY_ID: "CmAcmCaseIdentifier",
			CaseIdentifier_PROPERTY: "CmAcmCaseIdentifier",
	 	    

			type: -1,
			_currentInputWidget: null,
			_isBoPropertySearch: false,
		 	
		 	constructor: function() {
		 		this.resourceBundle = icm.util.Util.getResourceBundle("casesearch");
				this._searchUtil = new SearchUtil();
				
				this._inputWidgets = {};
			},
			
			postCreate: function(){		
				this.logEntry("Case SearchContentPane postCreate");
				this.inherited(arguments);
				
				//Create the Quick Search ContenPane and InputArea
				dojo.style(this.quickSearchContent, "background", "#ffffff");
				this.searchButton.set("disabled", true);
				this.logExit("Case SearchContentPane postCreate");
			},
			
			/**
			 * Set the data that is used in the panel.
			 * This is called when initiating the panel.
			 * @param args
			 *         The parameters used to initiate the panel.
			 *                  <ul>
			 *                  <li>searchDisabled: a boolean value that will decide whether to disable the whole search widget
			 *                  <li>searchableProperties: searchable properties that will be listed
			 *                  <li>targetOS: object store to search against
			 *                  <li>isHideAdvancedButton: a boolean value that will decide whether to show the Advanced link			 *                 
			 *                  <li>allPropDefs: all properties that will be used in the Advanced Search dialog			 *                 
			 *                  <li>searchViewPropDefs: search View PropDefs that will be used in the Advanced Search dialog			 *  
			 *                  <li>solution: solution object that will be used in the Advanced Search dialog			 *  
			 *                  <li>role: role object that will be used in the Advanced Search dialog			 *  
			 *                  <li>isShowUserSpecified: a boolean value that will decide whether to show the User Specified section in the Advanced Search dialog
			 *                  </ul>
			 *
			 */
			setModel: function(args) {
				this.logEntry("Case SearchContentPane setModel", args);
				this.searchDisabled = args.searchDisabled;

				this.searchableProperties = args.quickSearchProperties;
				this.targetOS = args.targetOS;
				if(args.isHideAdvancedButton || this.searchDisabled){ 
					domStyle.set(this.advancedSearchButton, "display", "none"); 
				}	
				
				if (args.enableFindMyCasesButton && !this.searchDisabled) {
					domStyle.set(this.searchMyCasesButton.domNode, "display", "inline-block");
				}
				/*
				* they are for advanced search dialog only
				*/
				this.allPropDefs = args.allPropDefs;
				this.searchViewPropDefs = args.searchViewPropDefs;
				this.isShowUserSpecified = args.isShowUserSpecified;
				this.isShowAllProperties = args.isShowAllProperties;
				this.solution = args.solution;
				this.role = args.role;

				this._initSearchProperties();
				this._initFirstContentInput();
				this.logExit("Case SearchContentPane setModel");
			},

			/** 
			 * Returns the search criteria.
			 * 
			 * @return Returns an object of search criteria.
			 */
			getQuickSearchData: function() {
				this.logEntry("Case SearchContentPane getQuickSearchData");
				var id = this.getSearchPropertyID();
				var attDef = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, id);
				var criterion = new Array();
				if (attDef.dataType == "xs:object" ){
					criterion = this.createBOCriterion();
					this._isBoPropertySearch = true;
				}
				else{
					this._isBoPropertySearch = false;
					criterion = this.createCriterion();
				}				
				var data = {
					searchCriteria: {
						wellknown: [attDef],
						criterion: criterion
					}
				}; 
				this.logExit("Case SearchContentPane getQuickSearchData", data);
				return data;			
			},

			_initSearchProperties: function() {
				var store = this._getSearchablePropertiesStore();
				var id = (new Date()).getTime() + "searchablePropertySelect";	
				dojo.attr(this.searchablePropertySelectLabel, "for", id);
				var args = {
					id: id,
					name: "searchableProperty",
					required: false,
					store: store,
					searchAttr: "DisplayName",
					style: { width: "100%" },
					disabled: this.searchDisabled,
					onChange: lang.hitch(this, this._onSearchPropertiesChange)
				};
				if(this.searchableProperties && this.searchableProperties.length > 0) {
					args.value = this.searchableProperties[0].id;
				}	
				this.searchablePropertyInput = new FilteringSelect(args);				
				domClass.add(this.searchablePropertyInput.domNode, "icmSearchableProperty");
				this.searchablePropertyInput.placeAt(this.searchableProperty);
				aspect.after(this.searchablePropertyInput, "_handleOnChange", lang.hitch(this, this._focusFirstChar), true);
				aspect.after(this.searchablePropertyInput, "onChange", lang.hitch(this, this._setSelectorTitle), true);
				this.searchablePropertyInput.startup();
				this._setSelectorTitle();
			},
			
			_focusFirstChar : function() {
				dijit.selectInputText(this.searchablePropertyInput.focusNode, 0, 0);				
			},
			
			_setSelectorTitle : function(value) {
				if(this.searchablePropertyInput.item){
					var title = this.searchablePropertyInput.item.DisplayName[0];
					this.searchablePropertyInput.set("alt", title);
					this.searchablePropertyInput.set("title", title);
				}
				
			},
			
			_getSearchablePropertiesStore: function() {
				var items = new Array();
				dojo.forEach(this.searchableProperties, function(property) {
					items.push({
						DisplayName: property.name,
						SymbolicName: property.id,
						PropertyType: property.dataType});
				});
				var store = new dojo.data.ItemFileReadStore({
						data: {
							identifier: "SymbolicName",
							label: "DisplayName",
							items: items
						}
					});
				return store;	
			},
			
			//Here we retrieve the search property ID
			getSearchPropertyID: function() {
				var id = this.searchablePropertyInput.get('value');
				return id;
			},
			
			getSearchBOPropertyID: function() {
				var id = this.searchableBOPropertyInput.get('value');
				return id;
			},
			
			getSearchPropertyOperator: function(symbolicName){
				var propDef = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, symbolicName);
				var operator = this._searchUtil.OPERATOR.EQ;
				if(propDef){
		            var cardinality = propDef.cardinality ? propDef.cardinality : this._searchUtil.CARDINALITY.SINGLE;
		            var propType = propDef.dataType;

		            if(cardinality == this._searchUtil.CARDINALITY.MULTI || cardinality == this._searchUtil.CARDINALITY.LIST){
		                operator = this._searchUtil.OPERATOR.IN;
		            }else{ // single
		                if(propType == this._searchUtil.PROPERTY_TYPE.STRING){
		                    if(propDef.getChoiceList() || this._searchUtil.isUserProperty(symbolicName)){
		                        operator = this._searchUtil.OPERATOR.EQ;
		                    }else{
		                        operator = this._searchUtil.OPERATOR.STARTS_WITH;
		                    }
		                } else {
		                    operator = this._searchUtil.OPERATOR.EQ;
		                }
		            }
		        }
				return operator;
			},

			getSearchContent: function(symbolicName) {
				this.logEntry("Case SearchContentPane getSearchContent");
				var values = this._currentInputWidget.getValue();
				if(!dojo.isArray(values)) {
					values = [values];
				}
				if(this._currentInputWidget.declaredClass == "idx.form.Select") {
					values = this._getChoiceInputValue(values, symbolicName);
				} else if(this._currentInputWidget.declaredClass == "ecm.widget.StandByDropDownInput") {
					values = this.values;
					return values;
				}

				var i;
				var symbolicName = this.getSearchPropertyID();
				var adf = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, symbolicName);
				var dataType = adf.dataType;
				if(dataType == this._searchUtil.PROPERTY_TYPE.DATETIME) {
					values = this._handleDatetimeValue(adf, values);
					return values;
				}
				for(i = 0; i < values.length; i++) {
					if (values[i]) {
						values[i] = "" + values[i];						
					}
				}					
				this.logExit("Case SearchContentPane getSearchContent", values);
				return values;
			},

			createCriterion: function(isBOProperty) {
				this.logEntry("Case SearchContentPane createCriterion");
				var criterions = new Array();
				var symbolicName = "";
				var adf = {};
				if(!isBOProperty){
					symbolicName = this.getSearchPropertyID();
					adf = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, symbolicName);
				}
				else{
					symbolicName = this.getSearchBOPropertyID();
					adf = this._searchUtil.getAttributeDefinitionByID(this.boAttrDef, symbolicName);
									
				}
				var searchConfig = ecm.model.SearchConfiguration.getSearchConfiguration({
					repository: this.targetOS
				});
		        
		        if(adf.dataType === "xs:datetime"){//force to transfer the date time format 
				   adf.setDataType("xs:timestamp");
				}
		        
				 switch(adf.dataType){
						case "xs:float":
		                    adf.setDataType(this._searchUtil.PROPERTY_TYPE.DECIMAL);
		                    break;
		                default:
		                    break;
		         }
				


				var operators = searchConfig.getOperators(adf.dataType, adf.cardinality, adf.choiceList, adf.textSearchable, adf.nullable, adf.usesLongColumn);
				var format = adf.format;
				if (adf.dataType == "xs:timestamp") {
					// Time is not pertinent to search; use the date format instead 
					format = ecm.model.desktop.valueFormatter.getDefaultFormat("xs:date");
				}
			
				var values = this.getSearchContent(symbolicName);
				
				var selectedOperator = "";
				if(isBOProperty && adf && adf.cardinality == "LIST")
				{
					selectedOperator = "IN";					
				}
				else
					selectedOperator = this.getSearchPropertyOperator(symbolicName);
				
				var criterion = this._searchUtil.createSearchCriterionModel(adf, format, operators, selectedOperator, values);

				criterions.push(criterion);
				this.logExit("Case SearchContentPane createCriterion", criterions);
				return criterions;
			},
			
			createBOCriterion: function() {
				this.logEntry("Case SearchContentPane createCriterion");
				var criterions = new Array();
				
				var symbolicName = this.getSearchPropertyID();
				var adf = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, symbolicName);
				var searchConfig = ecm.model.SearchConfiguration.getSearchConfiguration({
					repository: this.targetOS
				});
		        
		        var operators = searchConfig.getOperators(adf.dataType, adf.cardinality, adf.choiceList, adf.textSearchable, adf.nullable, adf.usesLongColumn);
				var format = adf.format;
				
				var values = [];//ignore values for BO type
				var selectedOperator = "SATISFIES";//this.getSearchPropertyOperator(symbolicName);		
				var criterion = this._searchUtil.createSearchCriterionModel(adf, format, operators, selectedOperator, values);
				
				var boPropCriterion = this.createCriterion(true);
				//var allBoPropCriterions = new Array();
				//allBoPropCriterions.push(boPropCriterion);
				
				criterion.object_search_criteria = boPropCriterion;

				criterions.push(criterion);
				this.logExit("Case SearchContentPane createCriterion", criterions);
				return criterions;
			},

			clearInputValue: function() {
				var id = this.getSearchPropertyID();
				var attDef = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, id);
				var dataType = attDef.dataType;
				if(dataType == "xs:timestamp") {
					this._currentInputWidget.attr("value",dojo.date.stamp.toISOString(new Date()));
				} else {
					this._currentInputWidget.attr("value","");
				}
			},
			
			_initFirstContentInput: function() {
				if(this.searchableProperties && this.searchableProperties.length > 0) {
					var id = this.searchableProperties[0].id;
					var widgetId = this._getInputWidgetID(id);
					
					if (this.searchableProperties[0].dataType == "xs:object" ){
						this.boAttrDef = this._createDependentAttrDef(this.searchableProperties[0]);//get the definitions of the BO
						this._initBOSearchProperties();//create the drop down for the selection
						//create on change to create the input for the def
						if(this.boAttrDef && this.boAttrDef.length > 0) {
							var id = this.boAttrDef[0].id;
							var widgetId = this._getInputWidgetID(id);
							if(this.searchableBOPropertyInput){
								this.searchableBOPropertyInput.set("disabled", false);
							}
							
							if(!this._inputWidgets[widgetId]) {
								this._inputWidgets[widgetId] = this._createInputField(this.boAttrDef[0], widgetId);
							}

							this.quickSearchContent.appendChild(this._inputWidgets[widgetId].domNode);
							this._currentInputWidget = this._inputWidgets[widgetId];
							
							// rtc 107415, 149089
							var id = this.getSearchPropertyID();
							if (id == "CmAcmCaseIdentifier" && !this._currentInputWidget.getValue()) {
								this._currentInputWidget.setValue("%");
							}
							
						}
						else if(this.boAttrDef && this.boAttrDef == 0) {
							dojox.xml.parser.removeChildren(this.quickSearchContent);
							//this.searchDisabled = true;
							this.searchButton.set("disabled", true);
							if(this.searchableBOPropertyInput){
								this.searchableBOPropertyInput.set("disabled", true);
							}
						}
						this._onSearchContentChange();		
					}
					else{
						if(!this._inputWidgets[widgetId]) {
							this._inputWidgets[widgetId] = this._createInputField(this.searchableProperties[0], widgetId);
						}

						this.quickSearchContent.appendChild(this._inputWidgets[widgetId].domNode);
						this._currentInputWidget = this._inputWidgets[widgetId];
						
						// rtc 107415, 149089
						var id = this.getSearchPropertyID();
						if (id == "CmAcmCaseIdentifier" && !this._currentInputWidget.getValue()) {
							this._currentInputWidget.setValue("%");
						}
					this._onSearchContentChange();	
					}
					
				}
				

			},

			_createInputField: function(/*AttributeDefinition*/attDef, /*String*/inputId){
				var width = this._getInputAreaWidth(attDef);
				var isShowDefaultDate = attDef.cardinality.toLowerCase() == "single";
				var preferTextBoxForNumbers = false;
				if (sniff("ios")) {
					if (attDef.dataType == "xs:decimal" || attDef.dataType == "xs:double" ||
						attDef.dataType == "xs:integer") 
						preferTextBoxForNumbers = true;
				}
				var field = this._searchUtil.createSearchInputField(attDef, inputId, width, this.targetOS, isShowDefaultDate, this.searchDisabled, preferTextBoxForNumbers);

				aspect.after(field, "validate", lang.hitch(this, this._onSearchContentChange, field), true);
				this.connect(field, "onKeyPress", lang.hitch(this, this._onKeyPress), true);
				if(sniff("ios")){
		            this.connect(field, "onKeyUp", lang.hitch(this, this._onKeyPress), true);
		        }
				if(this._searchUtil.isUserProperty(attDef.id)) {
					var callSetValueFunction = lang.hitch(this, "_callSetValueWithOneFieldValue", field, this);
					aspect.after(field, "onChange", callSetValueFunction, true);
				}
				if(attDef.dataType == "xs:timestamp") {
					/*
					* Todo: in dojo 1.8 & new idx api, DatePicker can't set the correct width
					*/
					field.domNode.lastChild.style.width = "100%";
				}
				
				return field;
			},
			
			_createDependentAttrDef: function(attDef){
				if(this.solution.dependentObjectClassesById && this.solution.dependentObjectClassesById[attDef.requiredClass]){
					var items = new Array();	
					dojo.forEach(this.solution.dependentObjectClassesById[attDef.requiredClass].attributeDefinitions, function(property) {
						if(property.dataType != "xs:guid")
							items.push(property);
					});
					return items;
				}
			},
			
			_initBOSearchProperties: function() {
				var store = this._getSearchableBOPropertiesStore();
				var id = (new Date()).getTime() + "searchableBOPropertySelect";	
				//dojo.attr(this.searchablePropertySelectLabel, "for", id);
				var args = {
					id: id,
					name: "searchableBOProperty",
					required: false,
					store: store,
					searchAttr: "DisplayName",
					style: { width: "100%" },
					disabled: this.searchDisabled,
					onChange: lang.hitch(this, this._onSearchBOPropertiesChange)
				};
				if(this.boAttrDef && this.boAttrDef.length > 0) {
					args.value = this.boAttrDef[0].id;
				}	
				this.searchableBOPropertyInput = new FilteringSelect(args);				
				domClass.add(this.searchableBOPropertyInput.domNode, "icmSearchableProperty");
				this.searchableBOPropertyInput.placeAt(this.searchableBOProperty);
				this.searchableBOProperty.style.display = "";
				//aspect.after(this.searchableBOPropertyInput, "_handleOnChange", lang.hitch(this, this._focusFirstChar), true);
				//aspect.after(this.searchableBOPropertyInput, "onChange", lang.hitch(this, this._setSelectorTitle), true);
				this.searchableBOPropertyInput.startup();
				//this._setSelectorTitle();
			},
			
			_getSearchableBOPropertiesStore: function() {
				var items = new Array();
				dojo.forEach(this.boAttrDef, function(property) {
					items.push({
						DisplayName: property.name,
						SymbolicName: property.id,
						PropertyType: property.dataType});
				});
				var store = new dojo.data.ItemFileReadStore({
						data: {
							identifier: "SymbolicName",
							label: "DisplayName",
							items: items
						}
					});
				return store;	
			},
			
			_displaySearchContent: function() {
				var id = this.getSearchPropertyID();
				var inputWidgetId = this._getInputWidgetID(id);
				dojox.xml.parser.removeChildren(this.searchableBOProperty);
				dojox.xml.parser.removeChildren(this.quickSearchContent);
				
				if(!this._inputWidgets[inputWidgetId]) {
					var attDef = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, id);
					if (attDef.dataType == "xs:object" ){
						this.boAttrDef = this._createDependentAttrDef(attDef);//get the definitions of the BO
						this._initBOSearchProperties();//create the drop down for the selection
						//create on change to create the input for the def
						
						if(this.boAttrDef && this.boAttrDef.length > 0) {
							var id = this.boAttrDef[0].id;
							var widgetId = this._getInputWidgetID(id) + attDef.requiredClass;							
							if(this.searchableBOPropertyInput){
								this.searchableBOPropertyInput.set("disabled", false);
							}
							
							if(!this._inputWidgets[widgetId]) {
								this._inputWidgets[widgetId] = this._createInputField(this.boAttrDef[0], widgetId);
							}
							this.quickSearchContent.appendChild(this._inputWidgets[widgetId].domNode);
							this._currentInputWidget = this._inputWidgets[widgetId];
						}
						else if(this.boAttrDef && this.boAttrDef == 0) {
							dojox.xml.parser.removeChildren(this.quickSearchContent);
							//this.searchDisabled = true;							
							if(this.searchableBOPropertyInput){
								this.searchableBOPropertyInput.set("disabled", true);
							}
						}
					}
					else{
					/*if (attDef.dataType != "xs:object" ){
						dojox.xml.parser.removeChildren(this.searchableBOProperty);
					}*/
						this._inputWidgets[inputWidgetId] = this._createInputField(attDef, inputWidgetId);
						this.quickSearchContent.appendChild(this._inputWidgets[inputWidgetId].domNode);
						this._currentInputWidget = this._inputWidgets[inputWidgetId];
						
					}
				}
				else{
						this.quickSearchContent.appendChild(this._inputWidgets[inputWidgetId].domNode);
						this._currentInputWidget = this._inputWidgets[inputWidgetId];
				}
				//dojox.xml.parser.removeChildren(this.quickSearchContent);
				
				
			},
			
			_displaySearchBOContent: function() {
				var id = this.getSearchBOPropertyID();
				var inputWidgetId = this._getInputWidgetID(id);
				//dojox.xml.parser.removeChildren(this.searchableBOProperty);
				dojox.xml.parser.removeChildren(this.quickSearchContent);
				
				if(!this._inputWidgets[inputWidgetId]) {
					var attDef = this._searchUtil.getAttributeDefinitionByID(this.boAttrDef, id);
					this._inputWidgets[inputWidgetId] = this._createInputField(attDef, inputWidgetId);
				}
				//dojox.xml.parser.removeChildren(this.quickSearchContent);
				this.quickSearchContent.appendChild(this._inputWidgets[inputWidgetId].domNode);
				this._currentInputWidget = this._inputWidgets[inputWidgetId];
			},

			_onSearchPropertiesChange: function() {
				this._displaySearchContent();
				this._onSearchContentChange();
				var id = this.getSearchPropertyID();
				if (id == "CmAcmCaseIdentifier" && !this._currentInputWidget.getValue()) {
					this._currentInputWidget.setValue("%");
				}
			},
			
			_onSearchBOPropertiesChange: function() {
				this._displaySearchBOContent();
				this._onSearchContentChange();
				var id = this.getSearchPropertyID();
				if (id == "CmAcmCaseIdentifier" && !this._currentInputWidget.getValue()) {
					this._currentInputWidget.setValue("%");
				}
			},

			_onSearchContentChange: function() {
				var isValid = this._isCurrentInputValid();
				this.searchButton.set("disabled", !isValid || this.searchDisabled);
			},
			
			_onKeyPress: function(e) {
				if(sniff("ios")) {
			        this._onSearchContentChange();
			    }
				if(e.keyCode == dojo.keys.ENTER && this._isCurrentInputValid()) {
					if(sniff("ios")) { // dismiss the iPad keyboard
						document.activeElement.blur();
					}
					this.onClickSearchButton();
					e.preventDefault();
					return;
				}
			},

			_isCurrentInputValid: function() {
				var value = this._currentInputWidget.getValue();
				if(this._currentInputWidget.declaredClass == "idx.form.Select") {
					if(dojo.isString(value) && dojo.trim(value).length == 0)
						return false
					else
						return true;
				}
				
				if(dojo.isArray(value) && value.length == 0) {
					return false;
				}
				var id = this.getSearchPropertyID();
				var attDef = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, id);
				var dataType = attDef.dataType;
				
				var isValid = true;;
				if(dojo.isFunction(this._currentInputWidget.isValid)) {
					isValid = this._currentInputWidget.isValid();
				}

				if(((dataType == this._searchUtil.PROPERTY_TYPE.DECIMAL)||(dataType == this._searchUtil.PROPERTY_TYPE.INTEGER))) {
					if(dojo.isArray(value)) {
						var i;
						for(i = 0; i < value.length; i++) {
							if(isNaN(value[i])) {
								return false;
							}
						}
						return isValid;
					} else {
						return (isNaN(value) || value === null || (dojo.isString(value) && dojo.trim(value).length == 0) || !isValid) ? false : true;
					}					
				}
				if(value === null || ( typeof value === "undefined") || (dojo.isString(value) && dojo.trim(value).length == 0) || (dojo.isArray(value) && value.length == 0))
					return false;
				return isValid;
			},
			
			_getChoiceInputValue: function(displayName, symbolicName) {
				var value = "";
				var propDef = this._searchUtil.getAttributeDefinitionByID(this.searchableProperties, symbolicName);
				if(propDef.getChoiceList() && propDef.getChoiceList().Choices) {
					var choiceList = propDef.getChoiceList().Choices;
					for(var i = 0; i < choiceList.length; i++) {
						if(displayName == choiceList[i].ChoiceName) {
							value = choiceList[i].Value;
							return value;
						}
					}
				};
				return value;	
			},

			_handleDatetimeValue: function(adf, values) {			
				var cardinality = adf.cardinality ? adf.cardinality : this.searchUtil.CARDINALITY.SINGLE;
				
				//masking time portion of date
				for(i=0; i< values.length; i++) {
					if(values[i]) {
						value = new Date(values[i]);
						if(!isNaN(value.getTime())) {	//checking for valid date
							values[i] = dojo.date.stamp.toISOString(new Date(value.toDateString()));
						}
					}
				}
				
	            if(cardinality != this._searchUtil.CARDINALITY.MULTI && cardinality != this._searchUtil.CARDINALITY.LIST){
					//for single type, return the value directly					
					return [values[0] + ""];
				} 		
				
				for(i = 0; i < values.length; i++) {
					if (values[i]) {
						values[i] = "" + values[i];						
					}
				}		
				return values;
					
			},

			onClickSearchButton: function() {	
			},
			
			onClickSearchMyCases: function() {
			},
			
			onAdvancedButtonClick: function() {
				if(!this.searchDialog){	
					var wellknownProperties = icmglobal.wellKnownProperties.advancedSearchProperties;
				
					this.searchDialog = new SearchDialog({
						title: "Advanced Export",
						baseClass: "searchDialogDialogPaneContent dijitDialog icmSearchDialog",
						solution: this.solution,
						role: this.role,
						objectStoreName: this.targetOS.id,
						wellknownProperties: wellknownProperties,
						searchViewPropDefs: this.searchViewPropDefs,
						allSearchablePropDefs: this.allPropDefs,
						isShowAllProperties: this.isShowAllProperties,
						isShowUserSpecified:  this.isShowUserSpecified,
						searchCallback: lang.hitch(this,"executeAdvancedSearch")
					});
				}
				this.searchDialog.show();
			},
			
			executeAdvancedSearch: function(search) {
				this.logEntry("Case SearchContentPane executeAdvancedSearch", search);
				this.searchDialog.hide();
				this.logExit("Case SearchContentPane executeAdvancedSearch");
			},

			_onMouseEnter: function() {
		        domClass.add(this.advancedSearchButton, "icmAdvancedSearchHover");
		    },
			
			_onMouseLeave: function() {
		        domClass.remove(this.advancedSearchButton, "icmAdvancedSearchHover");
		    },

			_onAdvancedButtonPress: function(evt) {
				if(evt.keyCode == dojo.keys.ENTER) {
					dojo.stopEvent(evt);
					this.onAdvancedButtonClick(evt);
				}
			},

			_getInputAreaWidth: function(attDef) {
				var width = "100%";
				var searchableSelectorWidth = this.searchableProperty.offsetWidth - 33;
				if(searchableSelectorWidth < 0 ) {
					searchableSelectorWidth = 200;
				}
				if(attDef.cardinality != this._searchUtil.CARDINALITY.SINGLE) {
					width = searchableSelectorWidth + "px";
				} 
				
				if(sniff("ios") && (attDef.dataType == this._searchUtil.PROPERTY_TYPE.DECIMAL 
					|| attDef.dataType == this._searchUtil.PROPERTY_TYPE.INTEGER)) {
					width = this.searchableProperty.offsetWidth > 0 ? this.searchableProperty.offsetWidth + "px" : "200px";
				}
				return width;
			},

			_getInputWidgetID: function(propertyID){
				var id = propertyID + " " + this.id;
				return id;
			},

			_callSetValueWithOneFieldValue: function(field) {
				if ((field && field.getValueAsArray) && (!field.isValid || field.isValid())) { // avoid updating value and triggering dependent attribute logic for invalid values
					this.values = field.getValueAsArray();
				}
			},

						
			destroy: function() {
				delete this._currentInputWidget;
				if (this._inputWidgets) {
					for(var p in this._inputWidgets){
						var widget = this._inputWidgets[p];
						if(widget.destroyRecursive){
							widget.destroyRecursive();
						}else if(widget.destroy){
							widget.destroy();
						}
					}
					delete this._inputWidgets;
				}
				
				this.inherited(arguments);
			},

			_eoc_: null
		 });
});
