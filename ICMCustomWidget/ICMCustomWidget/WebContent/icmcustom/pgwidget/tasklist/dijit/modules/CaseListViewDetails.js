
define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-construct",
	"dojo/sniff",
	"idx/html",
	"ecm/LoggerMixin",
	"ecm/widget/listView/modules/ViewDetail",
	"icm/action/Action",
	"icm/action/case/OpenCasePage",
	"dojo/Stateful",
	"ecm/widget/dialog/ConfirmationDialog",
    "ecm/widget/dialog/MessageDialog",
    "icmcustom/util/WorkItemHandler"
], 
function(declare, 
		lang, 
		domConstruct, 
		sniff,
		idxHtml,
		LoggerMixin,
		ViewDetail,
		Action,
		OpenCase,
		Stateful,
		ConfirmationDialog,
		MessageDialog,
		WorkItemHandler
		) {
	 
	/**
	 * @name icm.pgwidget.caselist.dijit.modules.CaseListViewDetails
	 * @class This module provides detail view capability for the Case List widget.
	 * @augments ecm.widget.listView.modules.ViewDetail
	 * @private
	 */
    return declare("icmcustom.pgwidget.tasklist.dijit.modules.CaseListViewDetails", [ViewDetail, LoggerMixin,WorkItemHandler], {
    	/** @lends icm.pgwidget.caselist.dijit.modules.CaseListViewDetails.prototype */
	
		name: 'caseListViewDetails',
		caseObject :null,
		/**
		 * @private 
		 */
		getAPIPath: function() {
			return {
				caseListViewDetails: this
			};
		},

		preload: function() {
			this.inherited(arguments);
			 this.firstClickDate = null;
            this.firstClickTimer = null;
            this.doubleClickTiming = 1500;
		},
				
		/**
		 * Destroy.
		 * 
		 * @private 
		 */
		destroy: function() {
			this.logEntry("destroy");
			delete this.CASE_TITLE;
			delete this.widgetPaneId;
			
			this.inherited(arguments);
			this.logExit("destroy");
		},

		/** 
		 * Structure for this view.
		 * 
		 * @private 
		 */		 
		_getStructure: function() {		
			
			var t = this, cl = t.contentList;
			var columns =  cl._detailsView;
			if (!columns) {
				return;
			}
			var cellDeo = function() {
				var entry = '<a class="caseTitle" href="javascript:;" data-dojo-attach-point="caseTitleAnchor">'
					+ '<span data-dojo-attach-point="caseTitle"></span></a>';
				return entry;
			};
			var viewDecorator = this.getViewDecorator();
			var i;
			for (i = 0; i < columns.length; i++) {								
				// The first column is case title. When search on a case type, the title column has the symbolic name of the case title property.
				var setCellValue;
				if (i===0 && viewDecorator[this.CASE_TITLE]) {
					columns[i].widgetsInCell = true;
					columns[i].decorator = cellDeo;
					setCellValue = viewDecorator[this.CASE_TITLE];
					if (setCellValue) {
						columns[i].setCellValue = lang.hitch(this, setCellValue);
					}
				} else if (window.profilePlugin && profilePlugin.isUserNameField(columns[i].field)) {					
					columns[i].widgetsInCell = true;
					columns[i].decorator = lang.hitch(cl,  businessHoverCardDecorator);
					columns[i].setCellValue = lang.hitch(cl,  businessHoverCardCellValue);
				} else {
					setCellValue = viewDecorator[columns[i].field];
					if (setCellValue) {
						columns[i].decorator = setCellValue;
					} 
				}
				columns[i].allowEventBubble = true;
			}
			return columns;		
		},
		
		/**
		 * Returns the decorators of columns that are displayed in the details view of the Case List widget.
		 * 
		 * @return An object of decorator functions associated with specific data fields. 
		 */		
		getViewDecorator: function() {
		
			var viewDecorator = {};
            viewDecorator[this.CASE_TITLE] = lang.hitch(this, function (data, storeData, cellWidget) {
				var row = cellWidget.cell.row;
                var item = row.item();
                var title = item.getDisplayValue(this.CASE_TITLE);
                
				var openItemByLink = lang.hitch(this, function() {
					
					if(icmglobal.selectedItems){
					selectedItems=icmglobal.selectedItems;
					}
					if(icmglobal.caseObject){
						this.caseObject=icmglobal.caseObject;
					}
					
				
				if(selectedItems[0].attributes.TaskState=="WORKING")
					{
					var taskID=selectedItems[0].id;
					this.openWorkItem(taskID);
					}
				else
					{
					var solution=this.caseObject.getActionContext("Case")[0].caseType.solution;
					var objectstore=this.caseObject.getActionContext("Case")[0].caseType.objectStore.displayName;
					var repositoryId=this.caseObject.getActionContext("Case")[0].repository.repositoryId;
					var caseid=selectedItems[0].attributes.Coordinator;
					var field=caseid.split(',');
					caseid=field[2];
					var taskid=selectedItems[0].id;
					var field=taskid.split(',');
					taskid=field[2];
					
					var caseQuery = "SELECT * FROM CmAcmCaseFolder where Id ="+caseid;
					var taskQuery = "SELECT * FROM CmAcmCaseTask where Id ="+taskid;
					var searchTemplate= null;
					var caseColumns = this.caseObject.widgetProperties.CaseProperties;
					var taskColumns = this.caseObject.widgetProperties.TaskProperties;
					this.executeCaseSearch(repositoryId, caseQuery, taskQuery);
					//this.executeTaskSearch(repositoryId, taskQuery, searchTemplate);
	
					}
				});
				
                cellWidget.caseTitle.innerHTML = idxHtml.escapeHTML(title);
                cellWidget.caseTitleAnchor.onclick = lang.hitch(this, function (event) {
                    this.stopEvent(event);
                    if (this.firstClickTimer) {
                        var nowDate = new Date();
                        if (this.firstClickDate) {
                            console.log("cha   " + (nowDate - this.firstClickDate));
                        }
                        if (this.firstClickDate && (nowDate - this.firstClickDate) < this.doubleClickTiming) {
                            console.debug("this is double click");
                            window.clearTimeout(this.firstClickTimer);
                            this.firstClickTimer = null;
                            this.firstClickDate = null;
                            openItemByLink();
                        } else {
                            this.firstClickDate = new Date();
                            console.debug("this is single click1   " + this.firstClickDate);
                            this.firstClickTimer = setTimeout(openItemByLink, this.doubleClickTiming);
                        }
                    } else {
                        this.firstClickDate = new Date();
                        console.debug("this is single click2    " + this.firstClickDate);
                        this.firstClickTimer = setTimeout(openItemByLink, this.doubleClickTiming);
                    }
                });
                cellWidget.caseTitleAnchor.title = title;
                cellWidget.caseTitleAnchor.ondblclick = lang.hitch(this, function (event) {
                    this.stopEvent(event);
                });
            });
            return viewDecorator;		
		},

		/**
		 * Handles a click event when any view button is clicked.
		 * @private
		 * @param buttonViewName
		 *            Name of the view button clicked.
		 * @param currentViewName
		 *            Name of the current view button.
		 */
		onViewButtonClicked: function(buttonViewName, currentViewName) {
			this.logEntry("onViewButtonClicked");
			this.inherited(arguments);
			var t = this, cl = t.contentList, g = cl.grid;
			if (buttonViewName != t.name && currentViewName == t.name) { // switch to other view
				// keep the columns width
				var structure = t._getStructure();
				if(g._columns && structure.length == g._columns.length) {
					for (var i = 0; i < structure.length; i ++) {
						structure[i].width = g._columns[i].width;
					}
				}
			}
			this.logExit("onViewButtonClicked");
		},
		

		/**
		 * @private 
		 */
		stopEvent: function(event) {
			this.logInfo("stopEvent", "event type: " + event.type + ", detail: " + event.detail + ",ie:" + sniff("ie"));
			if (sniff("ie") === 8) {
				this.logInfo("stopEvent", "cancel bubble");
				event.cancelBubble = true;
			} else if(dojo.isFunction(event.preventDefault) && dojo.isFunction(event.stopPropagation)) {
				this.logInfo("stopEvent", "stop propagation");
				event.preventDefault();
				event.stopPropagation();
			}
		}		
		
	});
});
