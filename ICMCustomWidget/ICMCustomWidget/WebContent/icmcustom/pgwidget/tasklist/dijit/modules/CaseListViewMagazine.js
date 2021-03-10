
define([
	"dojo/_base/declare",
	"dojo/_base/lang",	
	"dojo/dom-construct",
	"dojo/sniff",
	"idx/html",
	"ecm/LoggerMixin",
	"ecm/widget/listView/modules/ViewMagazine",
	"icm/base/Constants",
	"icm/action/Action",
	"icm/action/case/OpenCasePage",
	"dojo/Stateful",
	"ecm/widget/dialog/ConfirmationDialog",
    "ecm/widget/dialog/MessageDialog"
], 
function(declare, 
		lang, 
		domConstruct, 
		sniff,
		idxHtml,
		LoggerMixin,
		ViewMagazine, 
		Constants,
		Action,
		OpenCase,
		Stateful,
		ConfirmationDialog,
		MessageDialog) {
	 
	/**
	 * @name icm.pgwidget.caselist.dijit.modules.CaseListViewMagazine
	 * @class This module provides magazine view capability for the Case List widget.
	 * @augments ecm.widget.listView.modules.ViewMagazine
	 * @private
	 */
	return declare("icmcustom.pgwidget.tasklist.dijit.modules.CaseListViewMagazine", [ViewMagazine, LoggerMixin], {
    	/** @lends icm.pgwidget.caselist.dijit.modules.CaseListViewMagazine.prototype */
	
		name: 'caseListViewMagazine',

		/**
		 * @private 
		 */
		getAPIPath: function() {
			return {
				caseListViewMagazine: this
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
			delete this.caseListModel;
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
			var caseListView = []; 
			var cellDeo = function() {
				var entry = '<div><a class="caseTitle" href="javascript:;" data-dojo-attach-point="caseTitleAnchor">'
					+ '<span data-dojo-attach-point="caseTitle"></span></a></div>'
					+ '<div data-dojo-attach-point="entry"></div>';
				return entry;
			};
			var contentCell = {
				field: "content",
				name: "",
				width: "100%",
				decorator: cellDeo,
				setCellValue: lang.hitch(this, this.getViewDecorator()),
				allowEventBubble: true, // required by gridx to propagate mouse events
				widgetsInCell: true
			};
			caseListView.push (contentCell);	
			return caseListView;
		},
		
		/**
		 * Returns the decorator of the cell value that is displayed in the magazine view of the Case List widget.
		 * 
		 * @return A decorator function for the cell value of the magazine view.
		 */	
		getViewDecorator: function() {
			
			var cellValue = lang.hitch(this, function(gridData, storeData, cellWidget) {
				if (!this.caseListModel) {
					return "";			
				}
				var currentRowIndex = cellWidget.cell.row.index();
				var item = cellWidget.cell.row.grid.model.byIndex(currentRowIndex).item;
				
				// set case title link
				var title = item.getDisplayValue(this.caseListModel.CASE_TITLE);				
				cellWidget.caseTitle.innerHTML = idxHtml.escapeHTML(title);
				
				// set case title event handlers
				cellWidget.caseTitleAnchor.onclick = lang.hitch(this, function(event) {
					this.stopEvent(event);
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
					// avoid duplicate action execution when double clicking the link								
					if(this.firstClickTimer){
                        var nowDate = new Date();
						if(this.firstClickDate) {
							console.log("cha   "+(nowDate - this.firstClickDate));
						}
                        if(this.firstClickDate && (nowDate - this.firstClickDate) < this.doubleClickTiming){
                            //clear timeout timer and reset first click date
                            console.debug("this is double click");
                            window.clearTimeout(this.firstClickTimer);
                            this.firstClickTimer = null;
                            this.firstClickDate = null;
                            openItemByLink();
                        } else{
                            
                            this.firstClickDate = new Date();
							console.debug("this is single click1   " + this.firstClickDate);
                            this.firstClickTimer = setTimeout(openItemByLink,this.doubleClickTiming);
                        }
                    } else{                      
                        this.firstClickDate = new Date();
						console.debug("this is single click2    " + this.firstClickDate);
                        this.firstClickTimer = setTimeout(openItemByLink,this.doubleClickTiming);
                    }
				});					
				cellWidget.caseTitleAnchor.ondblclick = lang.hitch(this, function(event) {
					this.stopEvent(event);
					// do nothing for double click on case title
				});
				var fieldsHTML = "";
				var magazineViewProperties = this.caseListModel.magazineViewProperties;
				if (magazineViewProperties) {
					fieldsHTML += '<div class="content">';
					fieldsHTML += this.caseListModel.getFormattedProperties(magazineViewProperties, item);
					fieldsHTML += '</div>';
				} else {
					var systemProperties = this.caseListModel.getSystemProperties();
					fieldsHTML += '<div class="content">';
					fieldsHTML += this.caseListModel.getFormattedProperties(systemProperties, item);
					fieldsHTML += '</div>';
				}
				
				var content = domConstruct.create("div", {
					"style" : "width: 100%",
					innerHTML : fieldsHTML
				});
				if (magazineViewProperties) {
					// Sametime awareness only if profilePlugin is present and attributes contains a user name field
					var i;
					for (i = 0; i < magazineViewProperties.length; i ++) {
						var symName = magazineViewProperties[i].symbolicName;
						if (symName == "LastModifier" || 
							(window.profilePlugin && profilePlugin.isUserNameField 
								&& profilePlugin.isUserNameField(symName))) {
							var shortName = item.attributes[symName];
							var idx = i * 2;
							var userNode = dojo.query(".content", content)[0].childNodes[idx].childNodes[2];
							userNode.nodeValue = "&nbsp;";
							var valueNode = domConstruct.create("span", {
								innerHTML : "&nbsp;"
							});
							userNode.parentNode.replaceChild(valueNode, userNode);
							profilePlugin.createLiveName(shortName, valueNode);
						}
					}					
				}
				cellWidget.entry.innerHTML = "";
				if (cellWidget.entry.firstChild == null) { // do not duplicate the cell when scrolling
					cellWidget.entry.appendChild(content);
				} else { // refresh the cell content
					cellWidget.entry.replaceChild(content, cellWidget.entry.firstChild);					
				}
			});
			return cellValue;
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
