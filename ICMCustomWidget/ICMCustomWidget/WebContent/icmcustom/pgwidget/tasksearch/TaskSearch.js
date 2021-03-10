define([ "icmcustom/pgwidget/tasksearch/dijit/TaskSearchContentPane",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/aspect",
	"dojo/data/ItemFileReadStore",
	"icm/util/SearchPayload",
	"icm/base/BasePageWidget",
	"ecm/model/AttributeDefinition",
	"icm/util/SearchUtil",
	"dojo/date"
	],

	function(TaskSearchContentPane, 
			declare, 
			lang, 
			aspect,
			ItemFileReadStore, 
			SearchPayload,
			BasePageWidget, 
			AttributeDefinition,
			SearchUtil,
			date
	) {

	/**
	 * @name icm.pgwidget.casesearch.CaseSearch
	 * @class Provides a widget that is used to render a Case search form 
	 * @augments dijit._Widget
	 */
	return declare("icmcustom.pgwidget.tasksearch.TaskSearch", [BasePageWidget, TaskSearchContentPane,SearchUtil], {
		/** @lends icm.pgwidget.casesearch.CaseSearch.prototype */

		taskName:null,	
		sensitiveRole:false,
		postCreate: function(){

			this.logEntry("Case Search postCreate");
			this.inherited(arguments);			
			this._searchPayload = new SearchPayload();			
			this._searchUtil = new SearchUtil();
			aspect.after(this, "onClickSearchButton", lang.hitch(this, this._onClickSearchButton), true);
			aspect.after(this, "executeAdvancedSearch", lang.hitch(this, this._onAdvancedButtonClick), true);
			this.initialize();		
			this.logExit("Case Search postCreate");
		},

		/**
		 * Handler for icm.ClearContent event.
		 */
		handleClearContent: function(){
			this.logEntry("Case Search handleClearContent");
			this.clearInputValue();
			this.logExit("Case Search handleClearContent");
		},    

		/*
		 * Retrieve quick search properties to construct the UI.
		 */
		initialize: function() {

			this.logEntry("Case Search initialize");
			if(this.solution){
				this.solution.retrieveCaseTypes(dojo.hitch(this, this._retrieveCaseTypesComplete));					
			}else{
				this.searchDisabled = true;
				this._getQuickSearchableProperties([]);
			}
			this.logExit("Case Search initialize");
		},

		_retrieveCaseTypesComplete: function(caseTypes) {

			if(!caseTypes || caseTypes.length == 0) {
				this.searchDisabled = true;
			} else {
				this.searchDisabled = false;
			}
			this.solution.retrieveAttributeDefinitions(dojo.hitch(this, "_getQuickSearchableProperties"),function (){}, function(){}, true);	

		},

		_onClickSearchButton: function() {
			var payload = this.getQuickSearchData();
			payload.caseType = "";
			payload.objectStoreName = this.solution.getTargetOS().id;
			this.fireEvent(payload, null);
		},

		_onAdvancedButtonClick: function(search) {

			this.fireEvent(search, null);
		},			

		fireEvent: function(search) {				
			var TaskName=this.widgetProperties.CmAcmTaskName;
			var TaskNameList="";
			if(TaskName!=null)
			{
				var TaskNameArray=TaskName.split(',');
				for(var t=0;t<TaskNameArray.length;t++)
				{
					TaskNameList=TaskNameList+"'"+TaskNameArray[t]+"',";
				}
				TaskNameList=TaskNameList.substring(0, TaskNameList.lastIndexOf(","));
			}

			if(!search.searchCriteria.criterion.length==0)
			{	
				var taskPropertiesFromQuery=this.widgetProperties.queryProperties;
				var taskProps="";
				if(taskPropertiesFromQuery!=null)
				{
					taskProps=taskPropertiesFromQuery;
				}
				else{
					taskProps="*";
				}
				var selectQueryString=null;
				if(this.widgetProperties.All)
				{
					selectQueryString="SELECT "+taskProps+" FROM CmAcmCaseTask WHERE CmAcmTaskName IN("+TaskNameList+")";
				}
				else if(this.widgetProperties.Working&&this.widgetProperties.Completed)
				{
					selectQueryString="SELECT "+taskProps+" FROM CmAcmCaseTask WHERE  (TaskState=4 or TaskState=5) and CmAcmTaskName IN("+TaskNameList+") and ";
				}
				else if(this.widgetProperties.Working||this.widgetProperties.Completed)
				{
					if(this.widgetProperties.Working)
					{
						selectQueryString="SELECT "+taskProps+" FROM CmAcmCaseTask WHERE TaskState=4 and CmAcmTaskName IN("+TaskNameList+") and  ";
					}
					else
					{
						selectQueryString="SELECT "+taskProps+" FROM CmAcmCaseTask WHERE TaskState=5 and CmAcmTaskName IN("+TaskNameList+") and  ";
					}
				}
				else{
					selectQueryString="SELECT "+taskProps+" FROM CmAcmCaseTask WHERE ";
				}
				if(search.anyCriteria==false)
				{
					var whereClause='';
					var selectQuery=selectQueryString;
					for(var i=0;i<search.searchCriteria.criterion.length;i++)
					{

						if(search.searchCriteria.criterion[i].id=="DateCreated"||search.searchCriteria.criterion[i].id=="DateLastModified"||search.searchCriteria.criterion[i].id=="DateCompleted"||search.searchCriteria.criterion[i].id=="DateStarted"||search.searchCriteria.criterion[i].dataType=="xs:timestamp")
						{
							if(search.searchCriteria.criterion[i].defaultValue[1]!=""){
								var date1 = new Date(search.searchCriteria.criterion[i].defaultValue[0]);
								var date2 = new Date(search.searchCriteria.criterion[i].defaultValue[1]);
								var date3 = date.add(date2, "day", 1);
								var beforeDate=	this.formatDate(date1);
								var afterDate=	this.formatDate(date3);
								whereClause=whereClause+' and '+search.searchCriteria.criterion[i].id+" > "+beforeDate+ " and " +search.searchCriteria.criterion[i].id+" < "+afterDate
							}
							else{
								var date1 = new Date(search.searchCriteria.criterion[i].value);
								var date2 = date.add(date1, "day", 1);
								var searchDate=	this.formatDate(date1);
								var afterDate=	this.formatDate(date2);
								whereClause=whereClause+' and '+search.searchCriteria.criterion[i].id+" > "+searchDate+ " and " +search.searchCriteria.criterion[i].id+" < "+afterDate
							}
						}
						else if(search.searchCriteria.criterion[i].dataType=="xs:integer")
							whereClause=whereClause+' and '+search.searchCriteria.criterion[i].id+" = "+search.searchCriteria.criterion[i].value
							else if(search.searchCriteria.criterion[i].id=="Creator")
								whereClause =whereClause+' and '+search.searchCriteria.criterion[i].id+" LIKE '"+search.searchCriteria.criterion[i].value.shortName+"'"
								else if(search.searchCriteria.criterion[i].dataType=="xs:boolean")
									whereClause =whereClause+' and '+search.searchCriteria.criterion[i].id+" = "+search.searchCriteria.criterion[i].value

									else
										whereClause =whereClause+' and '+search.searchCriteria.criterion[i].id+" LIKE '"+search.searchCriteria.criterion[i].value+"'"

					}

					whereClause=whereClause.replace('and',' ');

					var cequery =selectQuery+whereClause;
					icmglobal.taskSearch=this;
				}
				if (search.anyCriteria === undefined || search.anyCriteria === null) {

					if(search.searchCriteria.criterion[0].id=="DateCreated"||search.searchCriteria.criterion[0].id=="DateLastModified"||search.searchCriteria.criterion[0].id=="DateCompleted"||search.searchCriteria.criterion[0].id=="DateStarted"||search.searchCriteria.criterion[0].dataType=="xs:timestamp")
					{
						var date1 = new Date(search.searchCriteria.criterion[0].value);
						var date2 = date.add(date1, "day", 1);
						var searchDate=	this.formatDate(date1);
						var afterDate=	this.formatDate(date2);
						var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" > "+searchDate+ " and " +search.searchCriteria.criterion[0].id+" < "+afterDate
					}
					else if(search.searchCriteria.criterion[0].dataType=="xs:integer")
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" = "+search.searchCriteria.criterion[0].value
						}
					}
				
					else if(search.searchCriteria.criterion[0].id=="Creator")
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" LIKE '"+search.searchCriteria.criterion[0].value.shortName+"'"
						}
					}
					else if(search.searchCriteria.criterion[0].dataType=="xs:boolean")
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" = "+search.searchCriteria.criterion[0].value
						}
					}
					else
					{
						var searchVal=search.searchCriteria.criterion[0].value;
						searchVal=searchVal.toLowerCase();
						if(searchVal == "null" || searchVal == "empty")
						{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" is null"
						}
						else{
							var cequery =selectQueryString+search.searchCriteria.criterion[0].id+" LIKE '"+search.searchCriteria.criterion[0].value+"'"
						}
					}

					cequery=cequery;

					icmglobal.taskSearch=this;
				}


				var model = {
						CaseType:search.caseType,
						ObjectStore: search.objectStoreName,
						solution: this.solution,
						criterions: search.searchCriteria.criterion,
						ceQuery:cequery,
						andSearch: !search.anyCriteria,
						isShowSummaryViewProperties : this.widgetProperties.isShowSummaryViewProperties
				}
				this._searchPayload.setModel(model);
				this._searchPayload.getSearchPayload(dojo.hitch(this, function(payload) {
					this.onBroadcastEvent("icm.SearchCases", payload);
				}));	
			}
		},

		formatDate : function(dateValue)
		{
			var year=dateValue.getFullYear();
			var month=dateValue.getMonth()+1;
			if(month<10)
			{
				month='0'+month;
			}
			var day=dateValue.getDate();
			if(day<10)
			{
				day='0'+day;
			}

			var returnDate=year+'-'+month+'-'+day;
			return returnDate;

		},



		_fireEvent: function(search, systemProps, summaryProps, searchProps, sql) {
			var criterions = search.searchCriteria.criterion;
			var solutionCriterion = this._createSolutionCriteria();
			criterions.push(solutionCriterion);
			if(!this._hasCaseStateCriterion(criterions)) {
				var caseStateCriterion = this._createCaseStateCriteria();
				criterions.push(caseStateCriterion);
			}
			//Here we setup the search payload
			var searchPayload = {
					CaseType: search.caseType,
					ObjectStore: search.objectStoreName,
					SystemProperties: systemProps,
					SearchProperties: searchProps,
					SummaryProperties:summaryProps,
					criterion:criterions,
					QuerySQL: sql
			};
			this.logInfo("_fireEvent", "Fire search cases event, its payload: " + dojo.toJson(searchPayload));
			this.context.onBroadcastEvent("icm.SearchCases", searchPayload);
		},

		_getQuickSearchableProperties: function(propDefs) {

			var quickSearchProperties = [];
			this.searchViewPropDefs = this._constructSearchViewPropertyDefs(propDefs);
			this.allPropDefs = this._constructAllSearchablePropertyDefs(propDefs);

			if(this.searchViewPropDefs.length == 0) {
				//If no Search Views exist in the solution, we include Case ID and Date Added in the dropdown.
				dojo.forEach(icmglobal.wellKnownProperties.quickSearchWellKnowProperties, function(property) {
					var attr = new AttributeDefinition({
						id: property.name,
						name: this.resourceBundle[property.name],
						repositoryType: 'p8',
						dataType: property.dataType,
						format: property.format || "",
						defaultValue: property.defaultValue || "",
						valueRequired: property.valueRequired || false,
						readOnly: property.readOnly || false,
						hidden: property.hidden || false,
						system: property.system,
						settability: "",
						allowedValues: property.validValues,
						maxLength: property.maxEntry,
						minLength: property.minEntry,
						minValue: property.minValue,
						maxValue: property.maxValue,
						cardinality: property.cardinality || this._searchUtil.CARDINALITY.SINGLE,
						choiceList: property.choiceList,
						contentClass: null,
						serachable: true,
						nullable: property.nullable || true,
						hasDependentAttributes: property.hasDependentAttributes || false,
						formatDescription: property.description || "",
						repository: this.solution.getTargetOS()
					});						
					quickSearchProperties.push(attr);
				}, this);
			} else {
				quickSearchProperties = this.searchViewPropDefs;
			}

			if(quickSearchProperties.length > 1) {
				//the display order of the properties is the alphabetical order
				quickSearchProperties.sort(function(a, b){
					return a.name < b.name ? -1 : 1;
				});
			}

			var isShowUserSpecified = true;
			if(this.widgetProperties && this.widgetProperties.advancedSearchUserSpecifiedSelector == "hideUserSpecified") {
				isShowUserSpecified = false;					
			}
			this.setModel({
				searchDisabled: this.searchDisabled,
				quickSearchProperties: quickSearchProperties,
				searchViewPropDefs: this.searchViewPropDefs,
				allPropDefs: this.allPropDefs,
				targetOS: this.solution.getTargetOS(),
				solution: this.solution,
				role: this.role,
				isHideAdvancedButton: this.widgetProperties.isHideAdvancedButton,
				isShowAllProperties: this.widgetProperties.isShowAllProperties,
				isShowUserSpecified: isShowUserSpecified
			});

		},

		/*
		 * Create union of properties from all Search Views, eliminating duplicates
		 */
		_constructSearchViewPropertyDefs: function(propDefs) {

			var searchDefs = [];
			if(this.solution) {
				var properties=this.widgetProperties.TaskProperties;
				var fields = properties.split(',');
				var caseTypes = this.solution.getCaseTypes();
				//for (i = 0; i < caseTypes.length ; i++ )
				//{
				//	var type = caseTypes[i];

				//fields = type.getSearchView() ? type.getSearchView().fields : [];
				for(j = 0; j < fields.length; j++) {
					if(!this._searchUtil.isInArray(searchDefs, fields[j], "id")) {
						var def = this._searchUtil.getAttributeDefinitionByID(propDefs, fields[j]);

						var k;
						for (k = 0; k < icmglobal.wellKnownProperties.searchExceptionProperties.length; k++)
						{
							if(def.id == icmglobal.wellKnownProperties.searchExceptionProperties[k].name) {
								if(icmglobal.wellKnownProperties.searchExceptionProperties[k].excludedValues && def.choiceList && def.choiceList.choices) {						
									var newChoices = [];
									var m, n;
									var excludedValues = icmglobal.wellKnownProperties.searchExceptionProperties[k].excludedValues;
									for(m = 0; m < def.choiceList.choices.length; m++) {
										var choice = def.choiceList.choices[m];
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
									def.choiceList.choices = newChoices;
								}
							}
						}

						searchDefs.push(def);
					}	
				}
				//	}
			}			

			if(searchDefs.length > 1) {
				//the display order of the properties is the alphabetical order
				searchDefs.sort(function(a, b){
					return a.name < b.name ? -1 : 1;
				});
			}
			return searchDefs;
		},

		/*
		 * Create all searchable properties in this solution, except hidden/object/egnored properties
		 */
		_constructAllSearchablePropertyDefs: function(propDefs) {

			var allDefs = [];
			var i;
			for(i = 0; i < propDefs.length; i++) {
				if(propDefs[i].searchable && !propDefs[i].hidden && propDefs[i].dataType !=	"xs:object" && !this._searchUtil.isInArray(this._searchUtil.ignoredProperties, propDefs[i].id, "id")) {
					allDefs.push(propDefs[i]);
				}
			}

			if(allDefs.length > 1) {
				//the display order of the properties is the alphabetical order
				allDefs.sort(function(a, b){
					return a.name < b.name ? -1 : 1;
				});
			}
			return allDefs;
		},

		_eoc_: null
	});
});

dojo.setObject("icmcustom.pgwidget.tasksearch",{});
