
define([ "dojo/_base/declare", 
		"dojo/sniff",
		"dojo/_base/lang",
		"dojo/aspect", 
		"icm/base/BasePageWidget",
		"icm/util/Coordination",
		"icm/widget/listView/modules/Toolbar",
		"icm/widget/listView/modules/RowContextualMenu",
		"icmcustom/pgwidget/tasklist/dijit/modules/CaseListViewDetails",
		"icmcustom/pgwidget/tasklist/dijit/modules/CaseListViewMagazine",	
		"icmcustom/pgwidget/tasklist/dijit/TaskListContentPane"
	], function(declare, 
			sniff,
			lang,
			aspect,
			BasePageWidget, 
			Coordination,
			icmToolbar, 
			icmContextMenu, 
			caseListViewDetails, 
			caseListViewMagazine, 
			contentPaneWidget){

	/**
	 * @name icm.pgwidget.caselist.CaseList
	 * @class Represents the Case List widget which displays the cases that are returned by a search. Case workers 
	 *        can select a case to view from the list.
	 * @augments icm.pgwidget.caselist.dijit.CaseListContentPane, icm.base.BasePageWidget
	 */
    return declare("icmcustom.pgwidget.tasklist.TaskList", [contentPaneWidget, BasePageWidget], {
    	/** @lends icm.pgwidget.caselist.CaseList.prototype */

		/** 
		 * constructor
		 *
		 * @private
		 */
		constructor: function(){
			this._contentPane = this;			
		},
		
		/** 
		 * Called after widget creation to initialize the widget.
		 *
		 * @private
		 */
		postCreate: function(){
			this.logEntry("postCreate");
			
			this.inherited(arguments);		

			// show the content pane
			this.showContentNode();	
			
			this.logExit("postCreate");
		},		
				
		/**
		 * Displays the Case List widget.
		 * 
		 * @private 
		 */
		showContentNode: function() {
			this.logEntry("showContentNode");

			this._contentPane.enableSwitch = this.widgetProperties ? this.widgetProperties.EnableSwitch : true;
			
			// check if the widget is configured to adjust height automatically as per total height of rows
			this._contentPane.autoHeight = this.domNode.style.height === "auto" ? true : false;

			// set ICN content list modules			
			var modules = [];			
			// show the toolbar area if there are more than one view or if toolbar buttons are configured
			var showToolbar = this.widgetProperties ? this.widgetProperties.EnableSwitch === true || this.widgetProperties.CaseItemToolbar.actionList.length > 0 : true;			
			if (showToolbar === true) {
				modules.push ({
					moduleClass: icmToolbar,
					dojoAttachPoint: "CaseItemToolbar"
				});
			}
			modules.push ({
				moduleClass: icmContextMenu,
				dojoAttachPoint: "CaseItemContextMenu"
			});
			var viewModules = this.getViewModules();
			var i;
			for (i = 0; i < viewModules.length; i ++) {
				modules.push(viewModules[i]);
			}					
			this._contentPane.ecmContentList.setContentListModules(modules);			
			
			// set callback when a case item is selected
			this.own(aspect.after(this._contentPane, "onCaseSelected", lang.hitch(this, this._broadcastSelectCase), true));			

			// set callback when the result set is rendered
			this.own(aspect.after(this._contentPane, "onAfterRenderPage", lang.hitch(this, this._onAfterRenderPage), true));			

			// display the content pane
			this.inherited(arguments);
			
			this.logExit("showContentNode");
		},

		/**
		 * Returns the details view of the Case List widget.
		 * 
		 * @return The details view of the Case List widget. 
		 */
		getDetailsViewModule: function() {
			var view = this.inherited(arguments);
			return view;
		},

		/**
		 * Returns the magazine view of the Case List widget.
		 * 
		 * @return The magazine view of the Case List widget.
		 */
		getMagazineViewModule: function() {
			var view = this.inherited(arguments);
			return view;
		},
		
		/** 
		 * Returns the list of view modules that are displayed in the Case List widget.
		 * 
		 * @return Returns an array of view modules that extends {@link ecm.widget.listView._View}.
		 */
		getViewModules : function() {
			var array = [];
			var detailsView = this.getDetailsViewModule();
			var magazineView = this.getMagazineViewModule();
			if (this.widgetProperties.ViewSelection === "DetailsView") {
				array.push(detailsView);
				if (this.widgetProperties.EnableSwitch === true) {
					array.push(magazineView);
				}
			} else { //MagazineView
				array.push(magazineView);
				if (this.widgetProperties.EnableSwitch === true) {
					array.push(detailsView);
				}
			}
			return array;
		},
	
		/**
		 * Handler for the icm.SearchCase event which is received when user starts a search for cases.
		 * 
		 * @param payload
		 *        	  The event payload which contains the search criteria and case properties to be displayed.
		 */
		handleICM_SearchCasesEvent: function(payload){
			
			this.logEntry("handleICM_SearchCasesEvent", payload);
			this._contentPane.doSearch(payload);
			this.logExit("handleICM_SearchCasesEvent");		
		},
		
		/**
		 * Handler for the icm.RefreshCaseList event which can be used to re-execute the query and refresh the list
		 * of cases.
		 * 
		 */	
		handleICM_RefreshCaseListEvent: function(){
			this.logEntry("handleICM_RefreshCaseListEvent");
			// Reexecute query and render the result
			this._contentPane.refresh();
			this.logExit("handleICM_RefreshCaseListEvent");
		},
		
		/**
		 * Handler for the icm.SortbyProperty event which can be used to sort the list of cases by the specified property
		 * of cases.
		 * 
		 */	
		handleICM_SortByProperty: function(payload) {
			this.logEntry("handleICM_SortByProperty", payload);
			if(payload.symbolicName) {
				this._contentPane.caseListModel.setSortingProperty(payload.symbolicName);
				this._contentPane.refresh();
			}
			this.logExit("handleICM_SortByProperty");
		},
		
		/**
		 * Handler for the icm.SelectRow event which can be used to select a case by row number or case id.
		 * 
		 */	
		handleICM_SelectRowEvent: function(payload){
			
			this.logEntry("handleICM_SelectRowEvent", payload);
			var caseItem;
			if(payload && payload.rowNumber) {
				caseItem = this._contentPane.getItemByIndex(payload.rowNumber);
			}
			if(payload && payload.caseId) {
				caseItem = this._contentPane.getItemByCaseId(payload.caseId);
			}
			if (caseItem) {
				this._contentPane.onSelectItem([caseItem]);
			}
			this.logExit("handleICM_SelectRowEvent");
		},
		
		/**
		 * Handler for the icm.ClearContent event which can be used to clear the list of cases.
		 * 
		 */
		handleICM_ClearContentEvent: function(){
			this.logEntry("handleICM_ClearContentEvent");
			// show an empty list
			this._contentPane.clearContent();
			this.logExit("handleICM_ClearContentEvent");
		},

		/**
		 * Event fired after a page is rendered when initial search or scrolling.
		 * 
		 * @private 
		 * @param resultSet
		 *            An instance of {@link ecm.model.ResultSet}
		 * @param count
		 *            The count of rendered items.
		 */
		_onAfterRenderPage: function(resultSet, count) {
			this.logEntry("_onAfterRenderPage");
			// totalCount: Total Count of the result set returned by Content Engine 5.2 or later. For other repositories, it is invalid.
			payload = { 
				"resultSet": resultSet,
				//"countResult": resultSet.totalCount,
				//"countRows": resultSet.items.length,
				"countNewItems": count
			};
			this.logInfo("onAfterRenderPage", "broadcast event: icm.SendSearchResult, Total count of result: " + resultSet.totalCount 
				+ ", Count of rows: " + resultSet.items.length + ", Count of newly rendered cases: " + count);
			this.onBroadcastEvent("icm.SendSearchResult", payload);	
			this.logExit("_onAfterRenderPage");			
		},
		
		/**
		 * Broadcast icm.SelectCase event given a caseEditable object.
		 * 
		 * @private 
		 * @param caseEditable
		 *            An object of {@link icm.model.caseEditable} representing a case. If not provided, broadcast the event to indicate that no case is selected.
		 */
		 _broadcastSelectCase: function(caseEditable) {
			 
			this.logEntry("_broadcastSelectCase");
			if (sniff("ios")) {
				/*for defect 121112, send out the event after 550ms.
				 * The defect can only be reproduced in such scenario: in Cases page, expand Case Info will hide part of the Case List grid.
				 * If the click point is covered by the opened Case Info, the current event point is deleted, then dojox.gesture.tap can't 
				 * trigger release function. Then tap will trigger hold function. 
				 */ 
				setTimeout(lang.hitch(this, function(){			
					if (caseEditable) {
						payload = { 
							"caseEditable": caseEditable
						};
						this.logInfo("_broadcastSelectCase - broadcast event: icm.SelectCase, case id: " + caseEditable.getIdentifier());
						this.onBroadcastEvent("icm.SelectCase", payload);
					} else {
						this.logInfo("_broadcastSelectCase - broadcast event: icm.SelectCase, no selection"); 	
						this.onBroadcastEvent("icm.SelectCase");
					}
				}), 550);
			} else {	
				if (caseEditable) {
					payload = { 
						"caseEditable": caseEditable
					};
					this.logInfo("_broadcastSelectCase - broadcast event: icm.SelectCase, case id: " + caseEditable.getIdentifier());
					this.onBroadcastEvent("icm.SelectCase", payload);
				} else {
					this.logInfo("_broadcastSelectCase - broadcast event: icm.SelectCase, no selection"); 	
					this.onBroadcastEvent("icm.SelectCase");
				}
			}
			this.logExit("_broadcastSelectCase");			
		},
		
		/** 
		 * Set solution context.
		 * 
		 * @private
		 */
		_setSolutionAttr: function(solution){
			this.inherited(arguments);
			if(solution){
				this.setActionContext("Solution", solution);
			}
		}		
		
	});
});
