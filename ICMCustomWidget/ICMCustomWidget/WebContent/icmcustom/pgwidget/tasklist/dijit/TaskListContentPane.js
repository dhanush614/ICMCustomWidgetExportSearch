
define([ "dojo/_base/declare", 
		"dojo/_base/lang",
		"dojo/dom-class",
		"dojo/text!./templates/TaskListContentPane.html",
		"dojo/aspect", 
		"dojo/dom-construct",
		"dojo/dom-geometry",
		"dojo/dom-style",
		"dojo/sniff",
		"gridx/modules/extendedSelect/Row",
		"ecm/widget/listView/ContentList",
		"icm/base/_BaseWidget",
		"icm/base/BaseActionContext",	
		"icm/base/Constants",	
		"icm/util/Util",
		"icm/widget/listView/modules/Toolbar",
		"icm/widget/listView/modules/RowContextualMenu",
		"icmcustom/pgwidget/tasklist/dijit/model/CaseListModel",
		"icmcustom/pgwidget/tasklist/dijit/modules/CaseListViewDetails",
		"icmcustom/pgwidget/tasklist/dijit/modules/CaseListViewMagazine",
		"ecm/model/SearchQuery",
		 "dojo/Stateful"
	], function(declare, 
			lang,
			domClass, 
			template, 
			aspect, 
			domConstruct,
			domGeom, 
			domStyle, 	
			sniff,
			ExtendedSelectRow,
			ContentList, 
			_BaseWidget, 
			BaseActionContext,
			Constants,
			baseUtil,
			icmToolbar, 
			icmContextMenu, 
			CaseListModel,
			caseListViewDetails, 
			caseListViewMagazine,
			SearchQuery,
			Stateful
		){
	 
	/** 
	 * @private
	 * @name icm.pgwidget.caselist.dijit.CaseListContentPane
	 * @class Represents the Case List content pane which displays the cases that are returned by a search. 
	 * @augments icm.base._BaseWidget, icm.base.BaseActionContext
	 */		
	return declare("icmcustom.pgwidget.tasklist.dijit.TaskListContentPane", [_BaseWidget, BaseActionContext], {
    	/** @lends icm.pgwidget.caselist.dijit.CaseListContentPane.prototype */
		templateString: template,
		widgetsInTemplate: true,
			
		/**
		 * Set the height of grid to total height of rows
		 */
		autoHeight: false,
		
		/**
		 * Allow user to switch between views
		 */
		enableSwitch: true,
				
		/**
		 * Resource bundle
		 */		
		resourceBundle: null,
				
		/**
		 * The name of the default view
		 */
		defaultViewName: null,

		/**
		 * The CaseList model object
		 */
		caseListModel: null,	

		/**
		 * @private Event handlers
		 */		
		_connectors: null,

		/**
		 * @private A string value holding a repository identifier.
		 */		
		_repositoryId: null,

		/**
		 * @private A user provided Content Engine query statement that is used to search on cases.
		 */		
		 _ceQuery: null,

		/**
		 * @private A SearchQuery object that holds the ceQuery information. Only used when
		 * a ceQuery is provided.
		 */		
		 _searchQuery: null,
		 
		/**
		 * @private An {@link ecm.model.SearchTemplate} object.
		 */		
		 _searchTemplate: null,
		 
		/**
		 * @private A list of Content List modules
		 */		
		_contentListModules: [],
		that:null,
		
		/** 
		 * constructor
		 *
		 * @private
		 */		
		constructor: function(args){
			
			this.autoHeight = args.autoHeight || false;
			this.enableSwitch = args.enableSwitch || true;
			this.defaultViewName = args.defaultViewName || 'caseListViewDetails';
						
			this.caseListModel = args.caseListModel;
			if (!this.caseListModel) {
				this.caseListModel = new CaseListModel();
			}
			
			this._contentListModules = args.contentListModules;
			
			this.resourceBundle = args.resourceBundle || baseUtil.getResourceBundle("CaseList");

		},

		/** 
		 * Called after widget creation to initialize the widget.
		 *
		 * @private
		 */		
		postCreate:	function(){
			this.logEntry("postCreate");
			this.inherited(arguments);
			
			if (!this._contentListModules) {
				this._contentListModules = this.getDefaultContentListModules();
			}
			this.ecmContentList.setGridExtensionModules(this._getContentListGridModules());
			this.ecmContentList.setContentListModules(this._contentListModules);			

			// Note: this is required by Nexus contentlist widget. If not, will get a JS err.
			if (this.ecmContentList.startup) {
				this.ecmContentList.startup();
			}
			
			// set event listeners for Content List
			this._connectEvents();			

			this.logExit("postCreate");
		},

		/**
		 * Displays the widget.
		 * 
		 * @private 
		 */
		showContentNode: function() {
			this.logEntry("showContentNode");
			
			this.inherited(arguments);
			
			if (this.enableSwitch === false) {
				var toggleViewArea = this.ecmContentList.toggleViewArea;
				domStyle.set(toggleViewArea, "display", "none");
			}

			// show an empty list
			this.clearContent();
			
			this.logExit("showContentNode");
		},

		/** 
		 * Clean up the widget and its model objects, and remove the event listeners.
		 *
		 * @private
		 */		
		destroy: function() {
			this.logEntry("destroy");
			
			this.inherited(arguments);
			
			this._hideCaseListProgressMask();
			
			this.autoHeight = null;
			this.enableSwitch = null;
			this.resourceBundle = null;
			this.defaultViewName = null;
			this._repositoryId = null;
			this._ceQuery = null;
			this._searchQuery = null;
			delete this._searchTemplate;
			this._searchTemplate = null;			
			
			if (this.caseListModel) {
				this.caseListModel.destroy();
				this.caseListModel = null;
			}
						
			for ( var i = 0; i < this._contentListModules.length; i++) {
				delete this._contentListModules[i];
				this._contentListModules[i] = null;
			}
			this._contentListModules = [];
			
			this._resetConnectors();
			
			this.logExit("destroy");
		},

		/** 
		 * Resize the widget.
		 *
		 * @private
		 */		
		resize:	function(dimension)	{
			this.logEntry("resize", dimension);
			this.inherited(arguments);
			var cl = this.ecmContentList;
			this.logInfo("Content List Node width: " +  cl.domNode.clientWidth + ", height: " + cl.domNode.clientHeight);
			if (this.autoHeight) {
				this._adjustHeight();
				cl.resize();
				//Avoid rows are truncated due to grid.autoHeight=true
			   cl.grid.autoHeight = false;
			} else {
				cl.resize(dimension);
			}
			this.logInfo("Content List Node is resized to width " +  cl.domNode.clientWidth + ", height " + cl.domNode.clientHeight);			
			this.logExit("resize");
		},

		/** 
		 * Adjusts height if autoHeight is required.
		 *
		 * @private
		 */
		_adjustHeight: function() {
			this.logEntry("_adjustHeight");
			var minHeight = 260;
			var width = this.domNode.clientWidth - 17; 
			var cl = this.ecmContentList;
			var bEmpty = !cl.getResultSet() || !cl.getResultSet().items || cl.getResultSet().items.length === 0;
			
			// Set to minimum height if the result is empty.
			if (bEmpty) {
				domGeom.setMarginBox(cl.domNode, {
					w : width,
					h : minHeight
				});
				// Set empty node height to reset scrollbar
				var emptyNode = cl.grid ? cl.grid.emptyNode : cl.gridArea.domNode.firstChild;
				domStyle.set(emptyNode, "height", "60px");
			} else if (cl.grid) {
				cl.grid.autoHeight = this.autoHeight;
				// The grid's height is determined by the total height of the rows.
				cl.grid.resize({
					w : width - 17,
					h : undefined
				});

				// Update content list height as grid + toolbar + scrollbar
				var height = cl.grid.domNode.clientHeight + cl.topContainer.domNode.clientHeight + 17;
				if (cl.grid.headerNode.clientHeight == 0 && cl._viewCurrentName == "caseListViewDetails") {//add header if not created yet
					height += 70;
				}
				height = height < minHeight ? minHeight : height;

				// Set content list size
				domGeom.setMarginBox(cl.domNode, {
					w : width,
					h : height
				});
			}
			this.logExit("_adjustHeight");
		},
		
		/** 
		 * Render the result set in Case List content pane.
		 *
		 * @param resultSet
		 *            An instance of {@link ecm.model.ResultSet}
		 */		
		renderResultSet:function (resultSet){
			this.logEntry("renderResultSet");			
			
			// remove event listeners
			this._resetConnectors();
			
			// clean action context
			this.onSelectItem();
			
			// set call back for paging
			if (!this._searchQuery && this._searchTemplate) {
				this._connectors.push(aspect.after(this._searchTemplate, "onSearchCompleted", lang.hitch(this, function(resultSet){	
					this.logEntry("onSearchCompleted");
					this.caseListModel.onSearchCompleted(resultSet);
					//refresh the grid again, because case title are set. 
					this.ecmContentList.grid.body.refresh();
					this.logExit("onSearchCompleted");
				}), true));					
			} else if(this._searchQuery && this._ceQuery){
				// for ceQuery
				this._connectors.push(aspect.after(this._searchQuery, "onSearchCompleted", lang.hitch(this, function(resultSet){	
					this.logEntry("onSearchCompleted");
					this.caseListModel.onSearchCompleted(resultSet);
					this.ecmContentList.grid.body.refresh();
					this.logExit("onSearchCompleted");
				}), true));					
			}
			
			// render the result set
			this.caseListModel.hyperLinkField=this.widgetProperties.TitleProperty;
			this.caseListModel.buildCaseListGridModel(resultSet);		
			
			this.logExit("renderResultSet");		
		},

		/** 
		 * Called when the cases returned by a search is rendered.
		 *
		 * @private
		 */
		_onRender: function(resultSet) {
			this.logEntry("_onRender");
			var grid = this.ecmContentList.grid;
			if(this.autoHeight && grid && grid.body) {
				// Make sure that all rows are rendered as the vertical scroll bar is not displayed
				grid.body.renderRows(0, resultSet.items.length, 0, 1);
				grid.body.onForcedScroll();
			}
			this.logExit("_onRender");
		},		

		/** 
		 * Show the progress mask.
		 *
		 * @private
		 */
		_showCaseListProgressMask:function(){
			this.logEntry("_showCaseListProgressMask");
			var	targetNode = this.caseListContainer;

			if(this.progressMaskNode){
				this._hideCaseListProgressMask();
			}
			
			var	progressMaskNode = domConstruct.create("div", null,	targetNode,	"first");
			this.progressMaskNode =	progressMaskNode;
			
			domClass.add(progressMaskNode,	"icmCaseListProgressMask");

			progressMaskNode.onclick = function(event) {
				if(!sniff("ie")){
					//for firefox
					event.stopPropagation();
				}
			};
			progressMaskNode.ondblclick	= function(event) {
				if(!sniff("ie")){
					//for firefox
					event.stopPropagation();
				}
			};

			var contextRoot = icmglobal.contextRoot || "/ICMClient";
			var	imgSrc = contextRoot + "/icm/pgwidget/caselist/themes/default/images/progressAnim.gif"; 
			progressMaskNode.innerHTML = "<img src=\'" + imgSrc	+ "\' />"; 

			dojo.style(progressMaskNode, "position", "absolute");

			var	desiredVerticalOffset =	100;
			var	desiredHorizontalOffset	= this.caseListContainer.clientWidth / 2 - 30;

			dojo.style(progressMaskNode, "top",	((targetNode.offsetTop + desiredVerticalOffset)	+ "px"));
			dojo.style(progressMaskNode, "left", ((targetNode.offsetLeft + desiredHorizontalOffset)	+ "px"));

			// Instead of dynamically making the DIV overlay the same size as the node underneath it, hardcode it to be	the	size of	progressAnim.gif.
			dojo.style(progressMaskNode, "width", ("50px"));
			dojo.style(progressMaskNode, "height", ("50px"));
			this.logExit("_showCaseListProgressMask");
		},

		/** 
		 * Hide the progress mask.
		 *
		 * @private
		 */
		_hideCaseListProgressMask:function(){
			this.logEntry("_hideCaseListProgressMask");
			var	targetNode = this.caseListContainer;
			 
			if (this.progressMaskNode && targetNode){
				targetNode.removeChild(this.progressMaskNode);
				dojo.destroy(this.progressMaskNode);
				this.progressMaskNode =	null;
			}
			this.logExit("_hideCaseListProgressMask");
		},
		
		/**
		 * Get the list of modules to be added to the Content List.
		 * 
		 * @private 
		 * @return The list of Content List modules.
		 */
		 getDefaultContentListModules: function () {
			 
			var array = [];
			array.push ({
				moduleClass: icmToolbar,
				dojoAttachPoint: "CaseItemToolbar"
				});
			array.push ({
				moduleClass: icmContextMenu,
				dojoAttachPoint: "CaseItemContextMenu"
			});		
			var viewModules = this.getViewModules();
			var i;
			for (i = 0; i < viewModules.length; i ++) {
				array.push(viewModules[i]);
			}
			this.logInfo("getDefaultContentListModules", array);
			return array;
		},
		
		/**
		 * Get the Content List grid extension modules.
		 * 
		 * @private 
		 * @return The list of grid extension modules.
		 */
		_getContentListGridModules: function () {
			var array = [];
			array.push({
				moduleClass: ExtendedSelectRow,
				canSwept: false
			// disabling sweep selection to allows users to select text in the grid, copy it (control c), and paste it in the filter
			});			
			return array;
		},
				
		/**
		 * Returns the details view of the Case List content pane.
		 * 
		 * @return The details view of the Case List content pane. 
		 */
		getDetailsViewModule: function() {
			var view = {
				moduleClass: caseListViewDetails,
				CASE_TITLE: this.caseListModel.CASE_TITLE,
				widgetPaneId: this.id
			};			
			return view;
		},

		/**
		 * Returns the magazine view of the Case List content pane.
		 * 
		 * @return The magazine view of the Case List content pane.
		 */
		getMagazineViewModule: function() {
			var view = {
				moduleClass: caseListViewMagazine,
				caseListModel: this.caseListModel,
				widgetPaneId: this.id	
			};			
			return view;
		},
		
		/** 
		 * Returns the list of view modules that are displayed in the Case List content pane.
		 * 
		 * @return Returns an array of view modules that extends {@link ecm.widget.listView._View}.
		 */		
		getViewModules: function() {
			var array = [];
			if (this.defaultViewName === 'caseListViewDetails') {
				array.push(this.getDetailsViewModule());
				array.push(this.getMagazineViewModule());
			} else {
				array.push(this.getMagazineViewModule());
				array.push(this.getDetailsViewModule());
			}
			this.logInfo("getViewModules", array);
			return array;
		},
		
		/**
		 * Hide the Case List content pane.
		 */
		hide: function() {
			this.logEntry("hide");
			domStyle.set(this.caseListContainer, "display", "none");		
			this.logExit("hide");
		},

		/**
		 * Show the Case List content pane.
		 */
		show: function() {
			this.logEntry("show");
			domStyle.set(this.caseListContainer, "display", "block");		
			this.logExit("show");
		},

		/** 
		 * After the grid is created and all rows are rendered, adjusts the size of the widget.
		 * 
		 * @private
		 */
		_createGrid:  function() {	
			this.logEntry("_createGrid");
			// Set autoHeight for grid
			var cl = this.ecmContentList;
			cl.grid.autoHeight = this.autoHeight;
			
			//Hide the vertical scrollbar node
			var dn = cl.grid.vScrollerNode;
			if(dn) {
				dn.style.display = 'none';
			}
			
			// Resize to the minimum height if result set is empty
			if (!cl.getResultSet() || cl.getResultSet().items.length === 0) {
				this.resize();
				return;
			}

			// Connect to grid body for resizing grid height after rows are all filled	
			this._connectors.push(aspect.after(cl.grid.body, "onAfterRow", lang.hitch(this, function(row){
				var cl = this.ecmContentList;
				var index = cl.grid.model.idToIndex(row.id);
				this.logInfo("onAfterRow", index);
				//this.logInfo("onAfterRow, total " + cl.getResultSet().items.length + ", " + index + ", " + row.id);
				if (index === cl.getResultSet().items.length - 1) {
					this.resize();				
				}
			}), true));

			this.logExit("_createGrid");
		},
		
		/** 
		 * Add event listeners.
		 * 
		 * @private 
		 */
		_connectEvents: function(){		
			this.logEntry("_connectEvents");

			// set callback when row selection in the grid changes
			this.own(aspect.after(this.ecmContentList, "onSelectItem", lang.hitch(this, this.onSelectItem), true)); 
			
			if (this.autoHeight) {
				// set callback when grid is created
				this.own(aspect.after(this.ecmContentList, "_createGrid",  lang.hitch(this, this._createGrid), true));				
			}
			
			this.own(aspect.after(this.caseListModel, "onResultSetInitialized", lang.hitch(this, function(resultSet, count, isRetrieveFirstPage) {
				this.logInfo("onResultSetInitialized", "isRetrieveFirstPage: " + isRetrieveFirstPage);
				if (isRetrieveFirstPage) {
					// set Content List result set when search is initiated
					this.ecmContentList.setResultSet(resultSet);
					if(resultSet) {
						var grid = this.ecmContentList.grid;
						if(this.autoHeight && grid && grid.body) {
							// Make sure that all rows are rendered as the vertical scroll bar is not displayed
							grid.body.renderRows(0, resultSet.items.length, 0, 1);
							grid.body.onForcedScroll();
						}	
					}
					this._hideCaseListProgressMask();			
				} else {					
					// for retrieving of next pages, only update the newly loaded cases on the grid
					var l = resultSet.items.length;
					for (var i = 0; i < count && l >= count; i++) {
						var rowId = l - i - 1;
						this.logInfo("onResultSetInitialized", "rowId: " + rowId);
						var caseFolder = resultSet.items[rowId];
						var grid = this.ecmContentList.grid;
						if (grid && caseFolder) {
							grid.store.onSet(caseFolder);
						}
					}
				}
				this.onAfterRenderPage(resultSet, count);
			}), true));
			this.logExit("_connectEvents");
		},
		
		/** 
		 * Remove event listeners
		 * 
		 * @private 
		 */
		_resetConnectors: function (){
			this.logEntry("_resetConnectors");			
			// remove event listeners
			if (this._connectors) {
				var i;
				for (i = 0; i < this._connectors.length; i ++) {					
					this._connectors[i].remove();
				}
			}
			this._connectors = [];					
			this.logExit("_resetConnectors");
		},

		/**
		 * Show an empty list.
		 *
		 */
		clearContent : function() {
			this.logEntry("clearContent");
			this.renderResultSet();
			this.logExit("clearContent");
		},
		
		/**
		 * Returns an item located at the given index in the result set.
		 * 
		 * @param index
		 *            Index of the item.
		 * @return An instance of {@link ecm.model.ContentItem}.
		 */
		getItemByIndex : function(index) {
			
			this.logEntry("getItemByIndex", "index: " + index);
			var resultSet = this.ecmContentList.getResultSet();
			if (!resultSet || !resultSet.items || resultSet.items.length < index + 1) { 
				// case list is empty, or the rowNumber is larger than the grid length
				return null;
			}
			var caseItem = resultSet.items[index];
			this.logExit("getItemByIndex", "found case item ", caseItem);
			return caseItem;
		},
		
		/**
		 * Returns an item with a given case identifier.
		 * 
		 * @param caseId
		 *            The case identifier.
		 * @return An instance of {@link ecm.model.ContentItem}.
		 */
		getItemByCaseId : function(caseId) {
			
			this.logEntry("getItemByCaseId", "caseId: " + caseId);
			var resultSet = this.ecmContentList.getResultSet();
			if (!resultSet || !resultSet.items) { 
				// case list is empty
				return null;
			}
			var caseItem;
			var i;
			for (i = 0; i < resultSet.items.length; i ++) {
				caseItem = resultSet.items[i];
				var item_caseId = caseItem.getValue(Constants.Case.IDENTITY);
				if (caseId === item_caseId) {
					this.logExit("getItemByCaseId", "found case item ", caseItem);
					return caseItem;
				}
			}
			return null;
		},

		/**
		 * Event fired after a page is rendered when initial search or scrolling.
		 * 
		 * @param resultSet
		 *            An instance of {@link ecm.model.ResultSet}
		 * @param count
		 *            The count of rendered items.
		 */
		onAfterRenderPage: function(resultSet, count) {
		},
		
		/**
		 * Update a case item in the list using attributes from a given case model.
		 * 
		 * @param caseModel
		 *            An object of {@link icm.model.Case} representing the case to be updated.
		 */	
		updateCaseInGrid: function(caseModel){	
			this.logEntry("updateCaseInGrid");
			if (!caseModel) {
				return;
			}
			var resultSet = this.ecmContentList.getResultSet();
			if (!resultSet || !resultSet.items) { // case list is empty, no need to refresh case item
				return;
			}

			// Get Case Id
			var caseId = caseModel.getIdentifier();
			// Look for the item in the list
			var bFound = false;
			var caseItem;
			var i, j;
			var rowIndex = -1;
			for (i = 0; i < resultSet.items.length; i ++) {
				caseItem =  resultSet.items[i];
				var item_caseId = caseItem.getValue(Constants.Case.IDENTITY);
				if (caseId === item_caseId) {
					bFound = true;
					rowIndex = i;
					break;
				}
			}
			if (!bFound) { // case is not in the list
				return;
			}
				
			// Update the attributes of the case item.
			var caseProperty;
			var propertyName;
			var propType;
			var changedCellNames = [];
			for (propertyName in caseItem.attributes) {
				caseProperty = caseModel.attributes[propertyName];
				propType = caseItem.attributeTypes[propertyName];
				var titleProperty = caseModel.getCaseType().getCaseTitleProperty();
				if (propertyName === "caseTitle") {					
					caseProperty = caseModel.attributes[titleProperty];
				}
				if(propType == "xs:timestamp" && caseProperty != undefined && caseProperty != null && lang.isObject(caseProperty)){
					//change date object to string
					if(lang.isArray(caseProperty)) {
						for(var i = 0; i < caseProperty.length; i++){
							if(lang.isFunction(caseProperty[i].toDateString)){
								caseProperty[i] = dojo.date.stamp.toISOString(caseProperty[i], {zulu: true});
							}
						}
					} else if(lang.isFunction(caseProperty.toDateString)){
						caseProperty = dojo.date.stamp.toISOString(caseProperty, {zulu: true});
					}
				}

				if (!(caseProperty === undefined) && propertyName != "DateCreated" && propertyName != "DateLastModified" && caseItem.attributes[propertyName] != caseProperty) { 
					// Do not change the system property, only refresh the changed cell.
					caseItem.attributes[propertyName] = caseProperty;	
					
					//for defect 93696, rollback the code. 
					if(caseModel.attributeDefinitions[propertyName] && 
						caseModel.attributeDefinitions[propertyName].choiceList && caseModel.attributeDefinitions[propertyName].choiceList.choices) {
						var newValue = "";
						for(j = 0; j < caseModel.attributeDefinitions[propertyName].choiceList.choices.length; j++) {
							if(caseModel.attributeDefinitions[propertyName].choiceList.choices[j].value == caseProperty) {
								newValue = caseModel.attributeDefinitions[propertyName].choiceList.choices[j].displayName;
							}
						}
						caseItem.attributeDisplayValues[propertyName] = newValue;
					}
					if(propertyName ==	"caseTitle") {
						caseItem.attributeDisplayValues[propertyName] = caseItem.attributeDisplayValues[titleProperty];
					}
					changedCellNames.push(propertyName);
				}
			}
			
			// Refresh the item in the grid
			var grid = this.ecmContentList.grid;
			grid.store.onSet(caseItem);
			
			if(rowIndex > -1 && changedCellNames.length > 0) {
				//only refresh the changed cell
	//			grid.body.refresh();
				for(i = 0; i < changedCellNames.length; i++) {
					var cellIndex = -1;
					var cellName = changedCellNames[i];
					for(j = 0; j < resultSet.columnNames.length; j++) {
						if(cellName == resultSet.columnNames[j]) {
							cellIndex = j;
							grid.body.refreshCell(rowIndex, cellIndex);
						}
					}				
				}			
			}
			this.logExit("updateCaseInGrid");
		},
		
		/**
		 * Executes Content Engine search and show the results.
		 * @private
		 * @param repositoryId
		 *             A string value holding a repository identifier.
		 * @param ceQuery
		 *            A user provided Content Engine query statement that is used to search on cases.
		 * @param searchTemplate
		 *            An {@link ecm.model.SearchTemplate} object.
		 */	
		executeCESearch: function(repositoryId, ceQuery, searchTemplate,columnNames){
			this.logEntry("executeCESearch");			
			if (!repositoryId || !ceQuery || !searchTemplate) {
				return;
			}
		
			var hyperLinkField=this.widgetProperties.TitleProperty;
			this._repositoryId = repositoryId;
			var repository = ecm.model.desktop.getRepository(repositoryId)
			this._ceQuery = ceQuery;
			this._searchTemplate = searchTemplate;
			
			if(searchTemplate.resultsDisplay && searchTemplate.resultsDisplay.sortBy 
				&& this.caseListModel && this.caseListModel.sortingProperty ){
					searchTemplate.resultsDisplay.sortBy = this.caseListModel.sortingProperty;
			}
			
			var xtra=this.widgetProperties.ExtraProperties.split(',');
			for(var x=0;x<xtra.length;x++){
			columnNames[columnNames.length]=xtra[x];
			}
			
			searchTemplate.resultsDisplay.columns=columnNames;
			//searchTemplate.resultsDisplay.columns=["CmAcmTaskName","TaskState","Coordinator","SS_ModalPremium","LastModifier","DateLastModified","SS_DeadLine","DateCreated"];
			var resultsDisplay = searchTemplate.resultsDisplay;
			var sortBy = this.hyperLinkField;//resultsDisplay.sortBy;
			var sortAsc = resultsDisplay.sortAsc;
			resultsDisplay.sortBy=sortBy;
			if (!this._searchQuery) {
				this._searchQuery = new SearchQuery();
			};

			this._searchQuery.repository = repository;	
			this._searchQuery.resultsDisplay = resultsDisplay;
			this._searchQuery.query = ceQuery;

			this._showCaseListProgressMask();			
			this._searchQuery.search(lang.hitch(this, function(results) {
				
					this.renderResultSet(results);
			}), sortBy, sortAsc);
			this.logExit("executeCESearch");
		},
		
		/**
		 * Executes navigator search and show the results.
		 * @private
		 * 
		 * @param searchTemplate
		 *            An {@link ecm.model.SearchTemplate} object.
		 */	
		executeNavigatorSearch: function(searchTemplate){
			this.logEntry("executeNavigatorSearch");
			if (!searchTemplate) {
				return;
			}
			
			this._repositoryId = null;
			this._ceQuery = null;
			this._searchTemplate = searchTemplate;
			if(searchTemplate.resultsDisplay && searchTemplate.resultsDisplay.sortBy 
				&& this.caseListModel && this.caseListModel.sortingProperty
				&& searchTemplate.resultsDisplay.sortBy != this.caseListModel.sortingProperty){
					searchTemplate.resultsDisplay.sortBy = this.caseListModel.sortingProperty;
			}
			
			this._showCaseListProgressMask();
			searchTemplate.search(lang.hitch(this, function(results){
				// Display the search results after query
				this.renderResultSet(results);
			}));			
			this.logExit("executeNavigatorSearch");		   
		},

		/**
		 * Refresh all case items in the list.
		 * 
		 */	
		refresh: function(){
			this.logEntry("refresh");		   
			// get the current grid columns width to be used to render the refreshed case list
			var cl = this.ecmContentList;
			var columnWidth = [];
			if (cl._viewCurrentName === "caseListViewDetails") {
				for (var i = 0; i < cl.grid._columns.length; i ++) {
					columnWidth.push(cl.grid._columns[i].width);
				}
			} else { 
				for (var i = 0; i < cl._detailsView.length; i ++) {
					columnWidth.push(cl._detailsView[i].width);
				}
			}
			this.caseListModel.setGridColumnWidth(columnWidth);
			
			if (this._ceQuery) { // result set is returned from a CE search
				this.executeCESearch(this._repositoryId, this._ceQuery, this._searchTemplate);
			} else {
				this.executeNavigatorSearch(this._searchTemplate);
			}
			this.logExit("refresh");		   
		},
		
		/**
		 * Executes search and show the results given case search parameters.
		 *
		 * @param  {object} searchParam
		 *         	<ul>
		 *         	<li> searchParam.detailsViewProperties: An array of properties that are to be displayed in the details view.
		 *         	<li> searchParam.magazineViewProperties: A JSON object that contains an array of properties for each case type that is being searched. These properties are displayed in the magazine view. 
		 *         	<li> searchParam.caseTypeTitles: A JSON object that contains the symbolic name of the case title property for each case type that is being searched.
		 *         	<li> searchParam.caseType: The symbolic name of the case type that is being searched. If the search is across a solution, the value of this parameter is "".
		 *         	<li> searchParam.ceQuery: A user provided Content Engine query statement that is used to search on cases.
		 *         	<li> searchParam.repositoryId: A string value holding a repository identifier.
		 *         	<li> searchParam.searchTemplate: An {@link ecm.model.SearchTemplate} object.
		 *         	</ul>
		 */		
		doSearch: function(searchParam) {
			
			this.logEntry("doSearch");	
			if(!searchParam) {
				return;
			}
		
			var column=this.widgetProperties.TaskSummaryView;
			var columnNames=[];
			searchParam.detailsViewProperties=[];
			var fields = column.split(';');
			
			for(var k=0;k<fields.length;k++)
				{
				var columnParams = fields[k].split(',');
				columnNames[k]=columnParams[0];
				searchParam.detailsViewProperties[k]=[];
				searchParam.detailsViewProperties[k].symbolicName=columnParams[0];
				searchParam.detailsViewProperties[k].displayName=columnParams[1];
				searchParam.detailsViewProperties[k].type=columnParams[2];
				searchParam.detailsViewProperties[k].orderable=columnParams[3];
				}
		
			// initialize case list model
			this.caseListModel.detailsViewProperties = searchParam.detailsViewProperties;
			this.caseListModel.magazineViewProperties = searchParam.detailsViewProperties;
			this.caseListModel.caseTypeTitles = searchParam.caseTypeTitles;
			this.caseListModel.payload = searchParam;
			
			// Set the case type being seached
			this.caseListModel.caseType = searchParam.caseType && searchParam.caseType.length > 0 ? searchParam.caseType : Constants.Case.BASETYPE;	
			
			// execute search and render the results
			if (searchParam.ceQuery) {
				this.executeCESearch(searchParam.repository.id, searchParam.ceQuery, searchParam.searchTemplate,columnNames);
			} else if (searchParam.searchTemplate) {		
				this.executeNavigatorSearch(searchParam.searchTemplate);
			}		
			this.logExit("doSearch");	
		},
		

		
		/**
		 * The handler is called when row selection in the grid changes. 
		 * All selected icm.model.Case will be added into CaseReference, and the first selected case's editable object icm.model.CaseEditable will also be added into CaseReference. 
		 * 
		 * @private 
		 * @param selectedItems
		 *            Array of {@link ecm.model.ContentItem}.
		 */
		onSelectItem: function(selectedItems) {
			
		
			this.setActionContext("selectedItems", selectedItems);
			icmglobal.selectedItems=selectedItems;
			icmglobal.caseObject=this;
		
		var self=this;
			this.logEntry("onSelectItem");
			// make sure the selectedItems argument is not NULL
			selectedItems = selectedItems || [];
			for(var i = 0; i < selectedItems.length; i++) {
				if(selectedItems[i].declaredClass !="ecm.model.ContentItem"){
					
					/*
					return;
				*/}
			}
			var output = this._getSelectionDisplayList(selectedItems);
			this.logInfo("onSelectItem, selectedItems: " + output);
			
			// Update action context
			this.cleanActionContext("Case");
			this.cleanActionContext("CaseReference");
			this.cleanActionContext("Task");
			
			// no case is selected
			if (selectedItems.length === 0) {
				this.onCaseSelected();
				return;
			}
			this.setActionContext("Task", selectedItems[0], true);
			
			// otherwise set action context
			
			var i;
			for(i = 0; i < selectedItems.length; i++){
				// Get case model object
				//var caseId = selectedItems[i].getValue(Constants.Case.IDENTITY);
				var caseID=selectedItems[i].attributes.Coordinator;
				// Set action context for each selected case
				var fields = caseID.split(',');
				var caseId = fields[2];
				this.solution.retrieveCase(caseId ,function (cases){
					
					self.setActionContext("Case", cases, true);
					self.setActionContext("CaseReference", cases, true);
					//self.setActionContext("Task", selectedItems[0], true);
				});
		
			}	
			this.logExit("onSelectItem");
		
		
		
		
		},
		
		/**
		 * Listen to case object event to refresh the case item when properties are changed.
		 * 
		 * @private 
		 * @param caseModel
		 *            An object of icm.model.Case representing the case to be refreshed
		 */	
		_connectCase: function(caseModel){	
			
			this.logEntry("_connectCase");
			this._connectors.push(aspect.after(caseModel, "onRefresh", lang.hitch(this, function(){
				this.updateCaseInGrid(caseModel);
			}, caseModel), true));
			this.logExit("_connectCase");
		},		
		
		/**
		 * Event fired after a case is selected.
		 * 
		 * @param caseEditable
		 *            An object of {@link icm.model.caseEditable} representing a case. If not provided, indicating that no case is selected.
		 */		
		onCaseSelected: function(caseEditable) {
		},
		
		/**
		 * Show the selection list in debug mode.
		 * 
		 * @private 
		 */	
		_getSelectionDisplayList: function(selectedItems) {
			this.logEntry("_getSelectionDisplayList");
			if (!selectedItems) {
				return "";
			}
			var output = "length " + selectedItems.length + ", [";
			var caseId, caseItem, i;
			for (i = 0; i < selectedItems.length; i ++) {
				caseItem = selectedItems[i];
				caseId = caseItem.getValue(Constants.Case.IDENTITY);
				output += caseId;
				if (i < selectedItems.length - 1) {
					output += ", ";
				}
			}
			output += "]";
			this.logExit("_getSelectionDisplayList");
			return output;
		}
				
	});
});
