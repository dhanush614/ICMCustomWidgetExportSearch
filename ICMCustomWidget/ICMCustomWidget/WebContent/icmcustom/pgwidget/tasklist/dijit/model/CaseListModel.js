
define(["dojo/_base/declare", 
		"dojo/_base/lang",
		"dojo/aspect", 
		"ecm/LoggerMixin",
		"ecm/model/ResultSet",
		"icm/base/Constants",
		"icm/model/Case",
		"icm/util/Util"
	], 
	function(declare, 
			lang, 
			aspect,
			LoggerMixin, 
			ResultSet,
			Constants, 
			Case,
			Util){
	
    
	return declare("icmcustom.pgwidget.tasklist.model.CaseListModel", [LoggerMixin], {

		/**
		 * An {@link ecm.model.ResultSet} object storing search results
		 */
		_result: null,

		/**
		 * Indicates if the search is cross case type search. "CmAcmCaseFolder" means cross case type search, otherwise it is the symbolic name of the case type.
		 */
		caseType: null,		

		/**
		 * An array of {@link icm.model.Case} object representing the cases in the list
		 */
		cases: {},

		// The attribute for case title
		CASE_TITLE: "caseTitle", 

		_caseTitleAvgLength: 20, // average length of case title
		
		//spaces are needed for word wrapping
		PROPERTY_SEPARATOR: '<div class="dijitInline labelValueSeparator">|</div>',
		
		LABEL_VALUE_SEPARATOR: ":&nbsp;",
		
		_caseTitleTotalLength: 0,

		sortingProperty: null, // sorting property requested by user
		
		magazineViewProperties: null,
		detailsViewProperties: null,
		caseTypeTitles: null,

		hyperLinkField:null,
		
		
		/*
		 * @private A list of width for grid columns. It is used to render the result set.
		 */		
		gridColumnWidth: null,	
		
		constructor: function(){       
			this.caseType = null;
			this.sortingProperty = null;

			// Initialize a result set to show empty list
			var result = new ResultSet();
			result.structure = {};
			result.structure["cells"] = [];
			result.structure.cells.push([{
				field: "",
				name: "",
				sortable: false,
				width: "100%"
			}]);
			result.items = [];
			this._result = result;	
		},	
		
		/**
		 * Clean up objects on destroy.
		 */
		destroy: function() {
			this.logEntry("destroy");
			this._reset();
			this.sortingProperty = null;
			this.gridColumnWidth = null;
			this.magazineViewProperties = null;
			this.detailsViewProperties = null;
			this.caseTypeTitles = null;
			this.logExit("destroy");
		},
		
		/**
		 * Clean up the case items and result set from a previous query.
		 */
		_reset: function() {
			this.logEntry("_reset");
			
			// clean up case items
			for (caseItem in this.cases) {
				delete this.cases[caseItem];
				this.cases[caseItem] = null;
			}
			this.cases = {};
			
			// clean up result set
			this._resetResultSet();
			
			this.logExit("_reset");
		},

		/**
		 * Clean up the result set and remove the event handlers.
		 */
		_resetResultSet: function() {
			this.logEntry("_resetResultSet");
			if (this._result && this._result.items) { 
				for (var i = 0 ; i < this._result.items.length; i ++) {
					delete this._result.items[i];
					this._result.items[i] = null;
				}
				this._result.items = [];			
			}

			// remove event handlers
			this._clearResultSetConnections();

			this.logExit("_resetResultSet");
		},
		
		/**
		 * Set the sorting property's symbolic name for current search. 
		 * This is called when user defines a new sorting property by event.
		 * @param sortingProperty
		 *            The symbolic name for the sorting property
		 */
		setSortingProperty:	function(sortingProperty){
			this.logEntry("setSortingProperty -- sortingProperty", sortingProperty);
			
			if (this._validateSortingProperty(sortingProperty)) {		
				this.sortingProperty = sortingProperty;
			}		
			
			this.logExit("setSortingProperty");
		},

		/** 
		 * Build the grid view structure and initialize the result set returned from a search. 
		 *
		 * @param result
		 *            An instance of {@link ecm.model.ResultSet}
		 */				 
		buildCaseListGridModel:	function(result){
			;
			this.logEntry("buildCaseListGridModel");
			
			// clean up
			this._reset();	
			
			if (result) { 					
				this._result = result;
			} // else show an empty list (result set should have been cleaned)
			
			// flag indicate whether it's loading the first page.
			this._isRetrieveFirstPage = true;
			
			// Fill in items title and set the statistics
			this._filledItemsCount = 0;
			this._caseTitleAvgLength = 20;
			this._caseTitleTotalLength = 0;
			this._attributesMaxLength = {};
			
			// Connect to result set event to be notified when more items are loaded
			this._createResultSetConnections();
			
			// Fill in items title and set the statistics
			this._initializeItems();        
			this.logExit("buildCaseListGridModel");
		},

		_isCrossCaseTypeSearch: function(){
			//"CmAcmCaseFolder" string means cross case	type search
			if (this.caseType === Constants.Case.BASETYPE) {
				return true;
			}

			return false;
		},

		/**
		 * Set the grid structure
		 */
		_setGridStructure: function(){	
			
			this.logEntry("_setGridStructure");
				
			// Clear the structures associated with the grid view
			var result = this._result;
			if (!result) {
				return;
			}
				
			// Set details view structure
			var columns = [];
			var i;
			var colWidth;
			var property;
			var sortIndex = 0;
			if (this.detailsViewProperties) {
				for	(i=0; i< this.detailsViewProperties.length; i++) {
					property = this.detailsViewProperties[i];
					
					// Set the column width and sortIndex
					if (this.gridColumnWidth && this.gridColumnWidth[i]) {// if the columns width has been set					
						colWidth = this.gridColumnWidth[i];	
					} else {
						// Calculate the column width
						var calculatedAttributeMaxValue = this._attributesMaxLength[property.symbolicName] || 3;				
						colWidth = Math.max(property.displayName.length * 5.7 + 40,  calculatedAttributeMaxValue * 5.7) + "px";
						if (i == 0) { 
							// Set the case title column width per the average length of case titles
							colWidth = (Math.max(property.displayName.length + 1, this._caseTitleAvgLength) * 0.65) + "em";
						}
					}
					if (property.symbolicName == Constants.Case.IDENTITY || (this.sortingProperty && this.sortingProperty == property.symbolicName)) {
						// sort by case ID or sorting property
						sortIndex = i + 1;					
					}
					
					columns.push({
						field: property.symbolicName,
						name: property.displayName,
						sortable: property.orderable,
						type: property.type,
						width: colWidth
					});
				}
			}
			// will adjust columns width for further search
			this.setGridColumnWidth(null);
			
			// set column names
			delete result.columnNames;
			result.columnNames = [];
			var columnNames = result.columnNames;
			for	(i = 0;	i <	columns.length; i++) {
				columnNames.push(columns[i].field);
			}
			
			// set columns structure
			delete result.structure.cells;
			result.structure.cells = [];
			result.structure.cells.push(columns);
			
			// set sort index
			result.sortIndex = sortIndex;		
			
			this.logExit("_setGridStructure");
		},

		/**
		 * Initialize each case item in the resultset, set the case title and case type for display.
		 * 
		 * @private 
		 */
		_initializeItems: function(){	
			
			this.logEntry("_initializeItems");
			var result = this._result;
			if (!result) {
				return;
			}
			
		
			if (result.items.length === 0) {
				this._setGridStructure();
				this.onResultSetInitialized(result, 0, true);
				return;
			}
			var newResults=[];
			var s=0;
			
			// keep track of the cases being retrieved.
			this._caseResolvedCounter = 0;
			this._caseToResolveCount = result.items.length - this._filledItemsCount;

			var i;
			var toBeRemoved = [];
			for(i = this._filledItemsCount; i < result.items.length; i++) {
				var item = result.items[i];
				var field="TaskState";
				
				if(item.attributes.TaskState)
				{
					
					if(item.getValue(field)==0)
						item.attributes.TaskState="WAITING_ALL";
					else if(item.getValue(field)==1)
						item.attributes.TaskState="WAITING_PRECONDITION";
					else if(item.getValue(field)==2)
						item.attributes.TaskState="WAITING_PREDECESSORS";
					else if(item.getValue(field)==3)
						item.attributes.TaskState="READY";
					else if(item.getValue(field)==4)
						item.attributes.TaskState="WORKING";
					else if(item.getValue(field)==5)
						item.attributes.TaskState="COMPLETE";
					else if(item.getValue(field)==6)
						item.attributes.TaskState="FAILED";
					
				}
				// As it's asynchronous to retrieve the case now. 
				// it's likely that case title property has not been retrieved yet, when the case is being 
				// rendered in the grid. So set the title temporarily before it's fully retrieved.
			//	item.attributes[this.CASE_TITLE] = item.attributes[Constants.Case.IDENTITY] || "... ...";
				
				item.attributes[this.CASE_TITLE] = item.attributes[this.hyperLinkField] || "... ...";
				item.attributeDisplayValues[Constants.Case.TYPE] = "... ...";
				// var caseDefer = icm.util.Util.promisify(Case.fromContentItem, workitem);
				
				// Create Case model using the content item
				Case.fromContentItem(item, lang.hitch(this, this._onResolveCaseFromContentItem, toBeRemoved, i));		
				//Case.fromContentItem(item, lang.hitch(this, this.onResultSetInitialized(result), toBeRemoved, i));
			}	
			this._filledItemsCount = result.items.length;
			this.logExit("_initializeItems");
		},

		_onResolveCaseFromContentItem: function(toBeRemoved, position, caseModel) {
			
			
			this.logEntry("_onResolveCaseFromContentItem");
			var item = caseModel.caseFolder;
			var caseId = item.getValue(this.hyperLinkField);//item.getValue(Constants.Case.IDENTITY);
			this.cases[caseId] = caseModel;
			// Get the case type
			var caseType = caseModel.getCaseType();	
			//Get case title field
			//var caseTypeTitles = this.caseTypeTitles;
			//var titleField = caseTypeTitles && caseTypeId && caseTypeTitles[caseTypeId] ? caseTypeTitles[caseTypeId] : Constants.Case.IDENTITY;
			var title = item.getValue(this.hyperLinkField);
			var titleField="caseTitle";
			
			// set title attribute
			if (this._isCrossCaseTypeSearch()) {
				// for cross case type search, set title attribute as string type to support sorting on title column
				item.attributes[this.CASE_TITLE] = (title == undefined || title == null) ? "" : title + "";
				item.attributeTypes[this.CASE_TITLE] = "xs:string";
				item.attributeDisplayValues[this.CASE_TITLE] = item.getDisplayValue ? item.getDisplayValue(titleField) + "" : item.getValue(titleField) + "";
			} else {
				item.attributes[this.CASE_TITLE] = (title == undefined || title == null) ? "" : title;
				item.attributeTypes[this.CASE_TITLE] = item.getAttributeType(titleField);
				item.attributeDisplayValues[this.CASE_TITLE] = item.getDisplayValue ? item.getDisplayValue(titleField) : item.getValue(titleField);
			}
			item.attributeReadOnly[this.CASE_TITLE] = item.isAttributeReadOnly(titleField);	

			// only do calculation on the first page.
			if (this._isRetrieveFirstPage) {
				// Calculate the total length of case titles
				this._caseTitleTotalLength += item.attributeDisplayValues[this.CASE_TITLE] && item.attributeDisplayValues[this.CASE_TITLE].length ? item.attributeDisplayValues[this.CASE_TITLE].length : 20;
				
				// Calculate the max length of details view properties
				var j;
				
			for	(j=0; j<this.detailsViewProperties.length; j++) {
					var field = this.detailsViewProperties[j].symbolicName;
					var attrValue = item.getDisplayValue ? item.getDisplayValue(field) : item.getValue(field);
					var attrType = item.getAttributeType(field);
					var attrLength = attrValue && attrValue.length ? attrValue.length + 10 : 3;									
					if (!this._attributesMaxLength[field] || this._attributesMaxLength[field] < attrLength) {
						this._attributesMaxLength[field] = attrLength;
					}
				}

				// Calculate the average length of case titles
				//this._attributesMaxLength[Constants.Case.TYPE] = caseType.getDisplayName().length || 3;
				this._attributesMaxLength[Constants.Case.TYPE] = 20;
			}

			// Set case type display name 
			item.attributeDisplayValues[Constants.Case.TYPE] = "";

			this._caseResolvedCounter++;

			this.logInfo("_onResolveCaseFromContentItem", "Case ID: " + caseId + ", _caseResolvedCounter: " + this._caseResolvedCounter + ", _caseToResolveCount: " + this._caseToResolveCount);
			if (this._caseResolvedCounter === this._caseToResolveCount) {
				
				//for cross solution search, there will be some cases which the case type is removed, we need filter out them
				
				if(toBeRemoved && toBeRemoved.length > 0) {
					var newItems = [];
					for(var k = 0; k < this._result.items.length; k++) { 
						var isRemoved = false;
						for(var t = 0; t < toBeRemoved.length; t++) {
							if(k == toBeRemoved[t]) {
								isRemoved = true;
								break;
							}
						}
						if(!isRemoved) {
							newItems.push(this._result.items[k]);
						}
					}
					
					this._result.items = newItems;
				}
				
				// first page loaded.
				if (this._isRetrieveFirstPage) {
					this._caseTitleAvgLength = this._caseTitleTotalLength > 0 ? this._caseTitleTotalLength/this._result.items.length : 20;
					this._setGridStructure();					
					this.onResultSetInitialized(this._result, this._caseToResolveCount, this._isRetrieveFirstPage);
					this._isRetrieveFirstPage = false;		
				} else {
					this.onResultSetInitialized(this._result, this._caseToResolveCount, this._isRetrieveFirstPage);
				}
			}
			this.logExit("_onResolveCaseFromContentItem");
		},

		onResultSetInitialized: function(resultSet, count, isRetrieveFirstPage) {
			
		},

		/** 
		 * Get the HTML content to be displayed for a list of properties of a case item.
		 *
		 * @param properties
		 *            A list of properties.
		 * @param item
		 *            An instance of {@link ecm.model.ContentItem} representing a case.
		 */		
		getFormattedProperties:	function (properties, item){
			if(!properties) {
				return '';
			}
			
			var	fieldsHTML = "";
			var	j;
			var property;
			for(j =	0; j < properties.length; j++){
				var	field = properties[j].symbolicName;

				// Get property display name
				var displayName = properties[j].displayName;			
				var label = displayName + this.LABEL_VALUE_SEPARATOR;

				// Get property value
				var value = item.getDisplayValue ? item.getDisplayValue(field) : item.getValue(field);

				// Set the HTML content
				if (j > 0){	// Not the first property
					fieldsHTML += this.PROPERTY_SEPARATOR;
				}
				fieldsHTML += '<div class="dijitInline"><label>' + label + '</label>&nbsp;' 
					+ '<div class="dijitInline value">' + value + '</div></div>';
			}
			return fieldsHTML;
		},

		getSortingPropertyList: function() {
			var list = [];
			var i;
			for	(i=0; i<this.detailsViewProperties.length; i++) {
				if(this.detailsViewProperties[i].orderable) {
					list.push(this.detailsViewProperties[i].symbolicName);
				}			
			}
			return list;
		},
		
		/**
		 * Removes all result set connections.
		 * 
		 * @private
		 */
		_clearResultSetConnections: function() {
			this.logEntry("_clearResultSetConnections");
			if (this._resultSetConnector) {
				this._resultSetConnector.remove();
			}
			this.logExit("_clearResultSetConnections");
		},

		/**
		 * Create the result set connections.
		 * 
		 * @private
		 */
		_createResultSetConnections: function() {
			this.logEntry("_createResultSetConnections");
			if (this._result) {
				this._resultSetConnector = aspect.after(this._result, "onNextPageRetrieved", lang.hitch(this, function(){
					this._initializeItems();
				}), true);
			}
			this.logExit("_createResultSetConnections");
		},
		
		/**
		 * Event handler for seach template when query result is returned.
		 * 
		 * @param resultSet
		 *            An instance of {@link ecm.model.ResultSet}
		 */
		onSearchCompleted: function(resultSet) {
			this.logEntry("onSearchCompleted");
			if (resultSet != this._result) {
				// next page is retrieved
				
				this._filledItemsCount = 0;
					
				// clean up the current result set and remove the event handlers.
				this._resetResultSet();
				
				// set new result set
				this._result = resultSet;
				
				// create event handlers on result set
				this._createResultSetConnections();

				// render the new cases
				this._initializeItems();					
			}
			this.logExit("onSearchCompleted");
		},
		
		/**
		 * Set the grid columns width to be used to render the result set.
		 * 
		 * @param gridColumnWidth
		 *            A list of width for grid columns.
		 */
		 setGridColumnWidth: function(gridColumnWidth) {
			this.logInfo("setGridColumnWidth", gridColumnWidth);
			this.gridColumnWidth = gridColumnWidth;
		},
		
		/**
		 * Validate if a property can be used for sorting the grid rows.
		 * 
		 * @private 
		 */		
		_validateSortingProperty: function(symbolicName) {
			this.logEntry("_validateSortingProperty", "symbolicName: " + symbolicName);
			var sortList = this.getSortingPropertyList();
			var i;
			for(i = 0; i < sortList.length; i++) {
				if(sortList[i] == symbolicName) {
					this.logInfo("_validateSortingProperty", "property is found");
					return true;
				}
			}
			this.logExit("_validateSortingProperty");
			return false;
		},
		
		/**
		 * Get the well-known properties.
		 * 
		 * @return A list of well-known properties.
		 */		
		getSystemProperties: function(){
			var resourceBundle = Util.getResourceBundle("casesearch");
			var systemProperties = icmglobal.wellKnownProperties.systemWellKnownProperties;
			dojo.forEach(systemProperties, function(property){
				property.displayName = resourceBundle[property.symbolicName];
			});
			return systemProperties;
		}
		
	});

});
