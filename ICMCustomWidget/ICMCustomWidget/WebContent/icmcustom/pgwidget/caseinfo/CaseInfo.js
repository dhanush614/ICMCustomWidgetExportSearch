define([ "dojo/_base/declare",
		"dojo/_base/array",
		"dojo/_base/lang",
		"dojo/aspect",
		"dojo/dom-class",
		"dojo/dom-style",
		"icm/base/BasePageWidget",
		"icmcustom/pgwidget/caseinfo/dijit/CaseInfoContentPane" ], function(declare, array, lang, aspect, domClass, domStyle, BasePageWidget, CaseInfoContentPane) {

	/**
	 * @class Class that represent the CaseInfo widget
	 * @name icm.pgwidget.caseinfo.CaseInfo
	 */
	return declare("icmcustom.pgwidget.caseinfo.CaseInfo", [ CaseInfoContentPane,
			BasePageWidget ], /** @lends icm.pgwidget.caseinfo.CaseInfo.prototype */ {

		postCreate : function() {
			console.log("From CaseInfo script");
			this.logEntry("postCreate() from CaseInfo");
			
			this.firstPressDate = null;
            this.doublePressTiming = 5000;
			
			// Set the tab definitions
			this.setTabDefinitions(this.widgetProperties.tabDefinition);

			// this.showContentNode();
			this.showHideCaseInfoHeader(this.widgetProperties.caseInfoShowCaseId);

			aspect.after(this, "onClickOpenCaseDetails", lang.hitch(this, this._onClickOpenCaseDetails), true);
			this.inherited(arguments);

			this.logExit("postCreate() from CaseInfo");
		},

		/**
		 * Handler for the icm.SelectCase event when selecting a case on case
		 * page. Display the case information for the case that is contained in
		 * the event payload.
		 * 
		 * @param {object} payload
		 *            <ul>
		 *            <li> caseEditable: An {@link icm.model.CaseEditable}
		 *            object that represents the case that is to be displayed.
		 *            </ul>
		 *            Example: payload = { "caseEditable": caseEditable};
		 */
		handleICM_SelectCaseEvent : function(payload) {
			this.logEntry("handleICM_SelectCaseEvent() from CaseInfo");
			this._showCaseInfo(payload);
			this.logExit("handleICM_SelectCaseEvent() from CaseInfo");
		},

		/**
		 * Handler for the icm.SendCaseInfo event when opening a case on case
		 * detail page. Display the case information for the case that is
		 * contained in the event payload.
		 * 
		 * @param {object} payload
		 *            <ul>
		 *            <li> caseEditable: An {@link icm.model.CaseEditable}
		 *            object that represents the case that is to be displayed.
		 *            <li> coordination: An {@link icm.util.Coordination }
		 *            object that is used internally by the widgets in the same
		 *            page.
		 *            </ul>
		 *            Example: payload = { "caseEditable": caseEditable,
		 *            "coordination": new icm.util.Coordination() };
		 */
		handleICM_SendCaseInfoEvent : function(payload) {
			this.logEntry("handleICM_SendCaseInfoEvent() from CaseInfo");
			this._showCaseInfo(payload);
			this.logExit("handleICM_SendCaseInfoEvent() from CaseInfo");
		},

		/**
		 * Handler for the icm.SendNewTaskInfo event when adding a task on Add
		 * Task page. Display the case information for the case that is related
		 * to the task in the event payload.
		 * 
		 * @param {object} payload
		 *            <ul>
		 *            <li> taskEditable: An {@link icm.model.TaskEditable}
		 *            object that represents the task that is to be added.
		 *            <li> coordination: An {@link icm.util.Coordination }
		 *            object that is used internally by the widgets in the same
		 *            page.
		 *            </ul>
		 *            Example: payload = { "taskEditable": taskEditable,
		 *            "coordination": new icm.util.Coordination() };
		 */
		handleICM_SendNewTaskInfoEvent : function(payload) {
			this.logEntry("handleICM_SendNewTaskInfoEvent() from CaseInfo");
			var caseObj = payload.taskEditable.getCase();
			var caseEditable = null;
			if (caseObj) {
				caseEditable = caseObj.createEditable();
			}
			payload.caseEditable = caseEditable;
			this._showCaseInfo(payload);
			this.logExit("handleICM_SendNewTaskInfoEvent() from CaseInfo");
		},
		/**
		 * Handler for the icm.RefreshTab event. Refresh the tab that is
		 * specified in the event payload.
		 * 
		 * @param {object} payload
		 *            <ul>
		 *            <li> tabId: The ID of the tab that is selected.
		 *            </ul>
		 *            Example: payload = {"tabId":"Tasks"}
		 */
		handleICM_RefreshTabEvent : function(payload) {
			this.logEntry("handleICM_RefreshTabEvent() from CaseInfo");
			if (!this.model) {
				return;
			}
			if (!payload || !payload.tabId) {
				var selectedChild = this.tabContainer.selectedChildWidget;
				selectedChild.onClickTab();
			} else {
				var selectTabId = payload.tabId;
				var tablist = this.tabContainer.getChildren();
				for ( var i = 0; i < tablist.length; i++) {
					if (tablist[i].definitionId == selectTabId) {
						tablist[i].onClickTab();
					}
				}
			}
			this.logExit("handleICM_RefreshTabEvent() from CaseInfo");
		},

		/**
		 * Handler for the icm.SelectTab event. Switch to the tab that is
		 * specified in the event payload. The tab is refreshed at the same
		 * time.
		 * 
		 * @param {object} payload
		 *            <ul>
		 *            <li> tabId: The ID of the tab that is selected.
		 *            </ul>
		 *            Example: payload = {"tabId":"Tasks"}
		 */
		handleICM_SelectTabEvent : function(/* String */payload) {
			this.logEntry("handleICM_SelectTabEvent() from CaseInfo");

			var selectTabId;
			var tablist = this.tabContainer.getChildren();
			if (payload && payload.tabId) {
				selectTabId = payload.tabId;
				if (this.tabContainer.selectedChildWidget.definitionId == selectTabId) {
					return;
				}

				for ( var i = 0; i < tablist.length; i++) {
					if (tablist[i].definitionId == selectTabId) {
						tablist[i].onClickTab();
						this.tabContainer.selectChild(tablist[i]);
					}
				}
			} else { // If no payload, select the first tab
				if (tablist.length > 0) {
					tablist[0].onClickTab();
					this.tabContainer.selectChild(tablist[0]);
				}
			}
			this.logExit("handleICM_SelectTabEvent() from CaseInfo");
		},

		/**
		 * Handler for the icm.FilterHistory event. Filter the entries on the
		 * History tab based on the criteria that is specified in the event
		 * payload.
		 * 
		 * @param {object} historyFilter
		 *            <ul>
		 *            <li>show
		 *            <li>showValue
		 *            <li>forEntry
		 *            <li>forValue
		 *            </ul>
		 * 
		 * Example: historyFilter = {"show": "Summary","showValue": "Summary",
		 * "forEntry": "Case",forValue: "Case"};
		 */
		handleICM_FilterHistoryEvent : function(historyFilter) {
			this.logEntry("handleICM_FilterHistoryEvent() from CaseInfo");

			var enResource = {
				"historyShowMenuSummary" : "Summary",
				"historyShowMenuAll" : "All",
				"historyShowOfMenuEveryEntryType" : "All",
				"historyShowOfMenuCase" : "Case",
				"historyShowOfMenuComments" : "Comments",
				"historyShowOfMenuDocuments" : "Documents",
				"historyShowOfMenuActivities" : "Tasks",
				"historyShowOfMenuFolders" : "Folders",
				"historyShowOfMenuRelationship" : "Case Relationship"
			};

			this.caseInfoHistory = null;
			for ( var i = 0; i < this._caseinfoTabs.length; i++) {
				if (this._caseinfoTabs[i].definitionId == "History") {
					this.caseInfoHistory = this._caseinfoTabs[i];
				}
			}
			if (this.caseInfoHistory && historyFilter) {
				if (historyFilter.show && (historyFilter.show == this.resourceBundle.historyShowMenuSummary || historyFilter.show == enResource['historyShowMenuSummary'])) {
					historyFilter.showValue = 'Summary';
				} else if (historyFilter.show && (historyFilter.show == this.resourceBundle.historyShowMenuAll || historyFilter.show == enResource['historyShowMenuAll'])) {
					historyFilter.showValue = 'All';
				}
				if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuEveryEntryType || historyFilter.forEntry == enResource['historyShowOfMenuEveryEntryType'])) {
					historyFilter.forValue = 'EveryEntryType';
				} else if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuCase || historyFilter.forEntry == enResource['historyShowOfMenuCase'])) {
					historyFilter.forValue = 'Case';
				} else if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuComments || historyFilter.forEntry == enResource['historyShowOfMenuComments'])) {
					historyFilter.forValue = 'Comments';
				} else if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuDocuments || historyFilter.forEntry == enResource['historyShowOfMenuDocuments'])) {
					historyFilter.forValue = 'Documents';
				} else if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuActivities || historyFilter.forEntry == enResource['historyShowOfMenuActivities'])) {
					historyFilter.forValue = 'Activities';
				} else if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuFolders || historyFilter.forEntry == enResource['historyShowOfMenuFolders'])) {
					historyFilter.forValue = 'Folders';
				} else if (historyFilter.forEntry && (historyFilter.forEntry == this.resourceBundle.historyShowOfMenuRelationship || historyFilter.forEntry == enResource['historyShowOfMenuRelationship'])) {
					historyFilter.forValue = 'Relationship';
				}

				this.historyFilter = historyFilter;
				if (historyFilter.showValue && this.caseInfoHistory.showMenu) {
					this.caseInfoHistory.showMenu.setMenuItem(historyFilter.showValue);
				}
				if (historyFilter.forValue && this.caseInfoHistory.showOfMenu) {
					this.caseInfoHistory.showOfMenu.setMenuItem(historyFilter.forValue);
				}
				if (this.model && this.model.caseEditable) {
					this.caseInfoHistory.dataState = this.caseInfoHistory.DataAbsent
					this.caseInfoHistory._loadData();
				}
			}
			this.logExit("handleICM_FilterHistoryEvent() from CaseInfo");
		},

		/**
		 * Handler for the icm.SelectInitialFolder event. Called to open the
		 * sub-folder within the case and show its content.
		 * 
		 * @param subFolderPath
		 *            string representing the sub-folder path within the case
		 *            folder.
		 */
		handleICM_SelectInitialFolderEvent : function(subFolderPath) {
			this.logEntry("handleICM_SelectInitialFolderEvent() from CaseInfo");
			var caseInfoDocuments = this.getTab("Documents");
			if (caseInfoDocuments) {
				caseInfoDocuments.handleSelectInitialFolder(subFolderPath);
			}
			this.logExit("handleICM_SelectInitialFolderEvent() from CaseInfo");
		},

		/**
		 * Handle icm.ClearContent event Clear the content in the Case
		 * Information widget.
		 */
		handleICM_ClearContentEvent : function() {
			this.logEntry("handleICM_ClearContentEvent() from CaseInfo");
			delete this.model;
			this.caseInfoCaseHeader.reset();

			array.forEach(this._caseinfoTabs, function(tab) {
				delete tab.model;
				if (tab._close) {
					tab._close();
				}
				tab.hideContentNode();
			});
			this.logExit("handleICM_ClearContentEvent() from CaseInfo");
		},

		/**
		 * Handler for the icm.SendWorkItem event. Display the Case information
		 * for the work item that is specified in the event payload.
		 * 
		 * @param payload
		 *            The WorkItemEditable object for the work item.
		 */
		handleICM_SendWorkItemEvent : function(payload) {
			this.logEntry("handleICM_SendWorkItemEvent() from CaseInfo");
			if (!payload) {
				this.handleICM_ClearContentEvent();
				return;
			}
			var callback = function(workitem) {
				var caseItem = workitem.getCase();
				if (caseItem != null) {
					caseItem.retrieveAttributes(lang.hitch(this, function(caseObj) {
						var caseEditable = caseObj.createEditable();
						payload.caseEditable = caseEditable;
						this._showCaseInfo(payload);
					}));
				}
			};
			if (payload.workItemEditable) {
				payload.workItemEditable.retrieveCachedAttributes(lang.hitch(this, callback));
			}
			this.logExit("handleICM_SendWorkItemEvent() from CaseInfo");
		},
		
		/**
         *
         * @private
         * Handler for icm.PageActivated event
         */
		handleICM_PageActivatedEvent: function(payload){ 
		
			if(this.tabContainer && this.tabContainer.selectedChildWidget && this.tabContainer.selectedChildWidget.historyNode){
				icm.pgwidget.caseinfo.dijit.history.CaseInfoHistoryActions.setContext(this.tabContainer.selectedChildWidget)
			}
		},

		/**
		 * Add a new dijit as a tab in Case Information. Used for a new custom
		 * tab on Case Information.
		 * 
		 * @param {object}
		 *            dijitObj The new custom tab dijit object. It should be an
		 *            instance of
		 *            {@link icm.pgwidget.caseinfo.dijit.CaseInfoComponentContentPane}
		 */
		addChild : function(dijitObj) {
			this.logEntry("addChild");
			// Add dijit
			this._customTabs.push(dijitObj);
			this.logExit("addChild");
		},
		
		_showCaseInfo : function(payload) {
			this.logEntry("_showCaseInfo() from CaseInfo");
			if (!payload || !payload.caseEditable) {
				this.handleICM_ClearContentEvent();
				return;
			}
			this.model = {};
			var caseEditable = payload.caseEditable;
			var caseObj = caseEditable.getCase();
			var caseId = caseObj.caseIdentifier;
			var caseTitle = caseObj.getCaseTitle();
			if(caseTitle!=null){
				this.model.caseTitle = caseTitle;
			}else{
				this.model.caseTitle = caseId;
			}
			// Add additional data in model
			if (payload.caseEditable) {
				this.model.caseEditable = payload.caseEditable;
			}
			if (payload.workItemEditable) {
				this.model.workItemEditable = payload.workItemEditable;
			}
			if (payload.taskEditable) {
				this.model.taskEditable = payload.taskEditable;
			}
			this.model.caseId = caseId;
			this.model.payload = payload;

			// render UI
			this.render();
			this.logExit("_showCaseInfo() from CaseInfo");
		},

		_onClickOpenCaseDetails : function() {
			this.logEntry("_onClickOpenCaseDetails() from CaseInfo");
			
			if (!this._caseCanOpen)
				return; 
			
			var caseEditable=null;
			
			var nowDate = new Date();
			if (this.firstPressDate && (nowDate - this.firstPressDate) < this.doublePressTiming) { 
                this.stopEvent(event);
                return;
            } else {
                this.firstPressDate = new Date();
            }
			
			if (!this.model || !this.model.caseEditable) {
				return; // TODO message or gray out
			}else{
				var caseObj = this.model.caseEditable.caseObject;
				var self = this;
				caseObj.retrieveMembershipStatus (function (memberStatus) {					
					if (memberStatus.canOpenCase()) {
						caseObj.retrieveAttributes(lang.hitch(this,function(){
							var openCasePagePayload = {
								"caseEditable" : caseObj.createEditable(),
								"coordination" : new icm.util.Coordination()
							};
							self.onBroadcastEvent("icm.OpenCase", openCasePagePayload);
						}));
					}
					else {
						icm.util.Util.showErrDialogForMessage("caseMembershipPermissionErr");
					}
				});
			}

			this.logExit("_onClickOpenCaseDetails() from CaseInfo");
		},

		_eoc_ : null
	});
});
