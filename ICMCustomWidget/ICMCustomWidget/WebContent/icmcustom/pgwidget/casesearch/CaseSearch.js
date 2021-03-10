
define([ "icm/pgwidget/casesearch/dijit/CaseSearchContentPane",
         "dojo/_base/declare",
         "dojo/_base/lang",
		 "dojo/aspect",
         "dojo/data/ItemFileReadStore",
		 "icm/util/SearchPayload",
         "icm/base/BasePageWidget",
		 "ecm/model/AttributeDefinition",
		 "icm/util/SearchUtil"
         ],

         function(CaseSearchContentPane, 
        		 declare, 
        		 lang, 
				 aspect,
        		 ItemFileReadStore, 
				 SearchPayload,
        		 BasePageWidget, 
        		 AttributeDefinition,
				 SearchUtil
        		 ) {

		 /**
		  * @name icm.pgwidget.casesearch.CaseSearch
		  * @class Provides a widget that is used to render a Case search form 
		  * @augments dijit._Widget
		  */
		 return declare("icmcustom.pgwidget.casesearch.CaseSearch", [BasePageWidget, CaseSearchContentPane], {
		 	/** @lends icm.pgwidget.casesearch.CaseSearch.prototype */
			
						
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
				this.solution.retrieveAttributeDefinitions(dojo.hitch(this, "_getQuickSearchableProperties"));	
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
				var model = {
					CaseType: search.caseType,
					ObjectStore: search.objectStoreName,
					solution: this.solution,
					criterions: search.searchCriteria.criterion,
					andSearch: !search.anyCriteria,
					isShowSummaryViewProperties : this.widgetProperties.isShowSummaryViewProperties
				}
				this._searchPayload.setModel(model);
				this._searchPayload.getSearchPayload(dojo.hitch(this, function(payload) {
					//Here we broadcast the icm.SearchCases event
					this.onBroadcastEvent("icm.SearchCases", payload);
				}));						
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

				if(quickSearchProperties.length > 1 && this.widgetProperties.isShowAlphabeticalOrder) {
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
					var caseTypes = this.solution.getCaseTypes();
					for (i = 0; i < caseTypes.length ; i++ )
					{
						var type = caseTypes[i];

						//add SearchView
						
						fields = type.getSearchView() ? type.getSearchView().fields : [];
						for(j = 0; j < fields.length; j++) {
							if(!this._searchUtil.isInArray(searchDefs, fields[j].name, "id")) {
								var def = this._searchUtil.getAttributeDefinitionByID(propDefs, fields[j].name);

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
					}
				}			
				
				if(searchDefs.length > 1 && this.widgetProperties.isShowAlphabeticalOrder) {
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
				
				if(allDefs.length > 1 && this.widgetProperties.isShowAlphabeticalOrder) {
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

dojo.setObject("icm.pgwidget.casesearch",{});
