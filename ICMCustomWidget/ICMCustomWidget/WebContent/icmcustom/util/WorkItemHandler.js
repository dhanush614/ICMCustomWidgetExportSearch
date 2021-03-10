define([
       "dojo/_base/declare",
       "dojo/_base/lang",
       "ecm/LoggerMixin",
       /*"icmcustom/util/ReopenCase",*/
       "ecm/widget/dialog/ConfirmationDialog",
       "ecm/widget/dialog/MessageDialog",
       "icm/model/Message",
       "ecm/widget/dialog/ErrorDialog",
       "dojo/_base/connect",
       "icm/util/Coordination",
       "icm/base/Constants",
       "dojo/Stateful",
       "dojox/layout/TableContainer"
       ],

       function(declare, lang, LoggerMixin,ConfirmationDialog, MessageDialog, Message, ErrorDialog, connect, Coordination, Constants, Stateful,TableContainer) {


       /**
       * Constructs a WorkItemHandler object.
       *
       * @param {object} broadcastInvoker
       *          An object that is capable of broadcasting event, a widget or a page.
       * @param {boolean} inactivePage
       *                  A Boolean that is set to true to indicate that the page will be created but not activated.
       * @name icm.util.WorkItemHandler
       * @class Provides a utility class for handling work items. This class examines the locked state of a work item and notifies
       *        end users if the work item is locked. This class also opens the Work Details page for those work items that 
        *        the current user can edit or view.
       * @augments ecm.LoggerMixin
       */
       return declare("icmcustom.util.WorkItemHandler", [LoggerMixin,/*ReOpen*/], {
              /** @lends icm.util.WorkItemHandler.prototype */

              _broadcastInvoker: null,
              _isNext: false,
              _currentUserHasAdminRights: false,
              caseColumns:null,
              caseStoreValue:null,
              caseGridLayout:null,
              lexisNexisCaseColumns:null,


              constructor: function(broadcastInvoker, inactivePage) {


                     this._broadcastInvoker = broadcastInvoker;
                     // Deprecated. Replace with _isCurrentPage
                     this._isNext = false;
                     this.resourceBundle = icm.util.Util.getResourceBundle("workItemHandler");
                     this._inactivePage = inactivePage;
              },

              /**
              * Examines the state of the work item and broadcasts the icm.OpenWorkItem event if the work item can be opened.
              * 
               * @param {object} icmWorkItem
              *                  The icm.model.WorkItem object that represents the work item that is to be examined.
              */
              handleWorkItem: function(icmWorkItem) {
                     this._currentUserHasAdminRights = icmWorkItem.currentUserHasAdminRights;
                     if (icmWorkItem.isBoundToOtherUser()) {
                           this._handleBoundToOther(icmWorkItem);
                     }
                     else {
                           var id = icmWorkItem.getCaseTaskId();
                           if (icmWorkItem.getLockedBy() !== "" && icmWorkItem.isLockedByCurrentUser() === false) {
                                  this._handleLockedByOther(icmWorkItem);
                           }
                           else if (icmWorkItem.getLockedBy() !== "" && icmWorkItem.isLockedByCurrentUser() === true) {
                                  this._handleAssumeLockBySame(icmWorkItem);
                           }
                           else if (icmWorkItem.getLockedBy() === "") {
                                  this._handleUnlocked(icmWorkItem);
                           }
                     }
              },

              /**
              * Retrieves the next work item in the in-basket and passes it to the <code>handleWorkItem(icmWorkItem)</code> 
               * for processing. Only next work item that belongs to the same user is processed. If next work item belongs 
               * to another user, the step is aborted and the current user is notified. 
               * 
               * @param {object} icmWorkItem
              *                  The icm.model.WorkItem object that represents the work item that is to be retrieved.
              */
              handleNextWorkItem: function(icmWorkItem) {
                     var inbasket = (icmWorkItem && icmWorkItem.ecmWorkItem && icmWorkItem.ecmWorkItem.parent) || null;

                     if (inbasket && inbasket.inbasketQueryParams) {                   

                           var originalInbasket = inbasket;
                           var inbasketQueryParams = inbasket.inbasketQueryParams;
                           var self = this;
                           var originalPageSize = lang.clone(originalInbasket.pageSize);
                           originalInbasket.pageSize = 1;
                           originalInbasket.retrieveWorkItems(function(lockedResultSet) {
                                  //retrieve work items locked by myself
                                  if (!lockedResultSet || !lockedResultSet.items || lockedResultSet.items.length === 0) {
                                         //no workitem locked by myself, retrieve the work items that are not locked
                                         originalInbasket.retrieveWorkItems(function(unlockedResultSet) {
                                                originalInbasket.pageSize = originalPageSize;
                                                if (!unlockedResultSet || !unlockedResultSet.items || unlockedResultSet.items.length === 0) {
                                                       self._showNoNextItem(icmWorkItem);
                                                } else {
                                                       originalInbasket.pageSize = originalPageSize;
                                                       var ecmWorkItem = unlockedResultSet.items[0];
                                                       var _nextIcmWorkItem = icm.model.WorkItem.fromWorkItem(ecmWorkItem);

                                                       self._isNext = true;
                                                       self.handleWorkItem(_nextIcmWorkItem, true);
                                                }
                                         }, inbasketQueryParams.orderBy, inbasketQueryParams.descending, inbasketQueryParams.refresh, inbasketQueryParams.filters,
                                         inbasketQueryParams.queryFilter, inbasketQueryParams.substitutionVars, inbasketQueryParams.queryFlags);

                                  } else {
                                         originalInbasket.pageSize = originalPageSize;
                                         var ecmWorkItem = lockedResultSet.items[0];
                                         var _nextIcmWorkItem = icm.model.WorkItem.fromWorkItem(ecmWorkItem);

                                         self._isNext = true;
                                         self.handleWorkItem(_nextIcmWorkItem, true);
                                  }
                           }, inbasketQueryParams.orderBy, inbasketQueryParams.descending, inbasketQueryParams.refresh, inbasketQueryParams.filters,
                           inbasketQueryParams.queryFilterByMyself, inbasketQueryParams.substitutionVarsByMyself);                    

                     } else {
                           this._handleNextItemFunc(icmWorkItem);
                     }
              },

              _handleNextItemFunc: function(icmWorkItem) {
                     icmWorkItem.retrieveNextItem(lang.hitch(this, function(nextIcmWorkItem) {
                           if(nextIcmWorkItem !== null && !nextIcmWorkItem.isBoundToOtherUser()){
                                  this._isNext = true;
                                  this.handleWorkItem(nextIcmWorkItem, true);
                           }
                           else{
                                  if (nextIcmWorkItem && nextIcmWorkItem.isBoundToOtherUser()) {
                                         nextIcmWorkItem.abortStep(lang.hitch(this, function(){this._showNoNextItem(icmWorkItem);}));
                                  }
                                  else {
                                         this._showNoNextItem(icmWorkItem);
                                  }
                           }
                     }));

              },

              /**
              * Examines the state of the work item and broadcasts the icm.OpenWorkItem event if the work item can 
               * be opened. Call this method when a work item must be open on the same page. For example, you call this 
               * method when a work item is fetched by user script and do not call this method for a work item 
               * is fetched by an In-basket widget.
              * 
               * @param {object} icmWorkItem
              *                  The icm.model.WorkItem object that represents the work item that is to be examined.
              */
              handleCurrentPageWorkItem: function(icmWorkItem) {
                     this._isNext = true;
                     this.handleWorkItem(icmWorkItem);
              },

              _showNoNextItem: function(icmWorkItem) {
                     var dialog = new MessageDialog({
                           text: this.resourceBundle["UnavailalableForOpenNextWorkItemInPageInfoText"]
                     });
                     connect.connect(dialog, 'onHide', lang.hitch(this, function(){
                           delete icmglobal._openItems[icmWorkItem.getCaseTaskId()];
                           icmglobal.caseObject.onBroadcastEvent("icm.ClosePage");
                     }));
                     dialog.setWidth(500);
                     dialog.show();
              },

              _handleBoundToOther: function(icmWorkItem) {
                     var dialog = new ConfirmationDialog({
                           text: this.resourceBundle["boundToOther"],
                           title: this.resourceBundle["lockedTitle"],
                           cancelButtonLabel: this.resourceBundle["NO"],
                           onExecute: lang.hitch(this, this._showReadOnly, icmWorkItem, null)
                     });
                     dialog.setWidth(500);
                     dialog.show();
              },

              _handleLockedByOther: function(icmWorkItem) {

                     if (this._currentUserHasAdminRights) {
                           var dialog = new ConfirmationDialog({
                                  text: this.resourceBundle["lockedByOtherUser"],
                                  title: this.resourceBundle["lockedTitle"],
                                  buttonLabel: this.resourceBundle["EDIT"],
                                  onExecute: lang.hitch(this, this._handleAssumeLockByOther, icmWorkItem)
                           });
                           dialog.addButton(this.resourceBundle["VIEW"], lang.hitch(this, this._showReadOnly, icmWorkItem, dialog), false, true);
                           dialog.setWidth(500);
                           dialog.show();
                     }
                     else {
                           var dialog = new ConfirmationDialog({
                                  text: this.resourceBundle["viewingOnly"],
                                  title: this.resourceBundle["lockedTitle"],
                                  buttonLabel: this.resourceBundle["VIEW"], 
                                  onExecute: lang.hitch(this, this._showReadOnly, icmWorkItem, null)
                           });
                           dialog.setWidth(500);
                           dialog.show();                   
                     }
              },
              _handleLockedByOtherReassign: function(icmWorkItem) {


                     var dialog = new ConfirmationDialog({
                           text: "This work item is assigned to someone else. Do you want to open the work item for viewing only?",
                           title: this.resourceBundle["lockedTitle"],
                           buttonLabel: this.resourceBundle["VIEW"], 
                           onExecute: lang.hitch(this, this._showReadOnly, icmWorkItem, null)
                     });
                     dialog.setWidth(500);
                     dialog.show();                   

              },
              _showReadOnly: function(icmWorkItem, dialog) {
                     if (dialog) {
                           dialog.hide();
                     }
                     icmWorkItem.retrieveCachedAttributes(lang.hitch(this, function() {

                           var icmWorkItemEditable = icmWorkItem.createEditable();
                           var id = icmWorkItem.getCaseTaskId();
                           icmglobal._openItems[id] = true;
                           var uiState = new Stateful();
                           var coordination = new Coordination();
                           uiState.set("workItemReadOnly", true);
                           uiState.set("GetNext", this._isNext);
                           icmglobal.caseObject.onBroadcastEvent("icm.OpenWorkItem", {
                                  workItemEditable: icmWorkItemEditable,
                                  coordination: coordination,
                                  UIState: uiState
                                  //isLazy: this._inactivePage
                           });
                           /*  if (this._isNext) {
                    this._startCoordination(coordination, this);
                }*/
                     }));
              },

              _handleUnlocked: function(icmWorkItem) {

                     /*Render new page and lock for editing*/
                     icmWorkItem.lockStep(lang.hitch(this, function(){
                           var icmWorkItemEditable = icmWorkItem.createEditable();
                           var id = icmWorkItem.getCaseTaskId();
                           icmglobal._openItems[id] = true;
                           var uiState = new Stateful();
                           var coordination = new Coordination();
                           uiState.set("workItemReadOnly", false);
                           uiState.set("GetNext", this._isNext);
                           icmglobal.caseObject.onBroadcastEvent("icm.OpenWorkItem", {
                                  workItemEditable: icmWorkItemEditable,
                                  coordination: coordination,
                                  UIState: uiState
                                  //isLazy: this._inactivePage
                           });
                           /* if (this._isNext) {
                    this._startCoordination(coordination, this);
                }
                this._isNext = false;*/
                     }));
              },

              _handleAssumeLockBySame: function(icmWorkItem) {
                     //icmWorkItem.abortStep(lang.hitch(this, function(){
                     icmWorkItem.lockStep(lang.hitch(this, function(){
                           var icmWorkItemEditable = icmWorkItem.createEditable();
                           var id = icmWorkItem.getCaseTaskId();
                           icmglobal._openItems[id] = true;
                           var uiState = new Stateful();
                           var coordination = new Coordination();
                           uiState.set("workItemReadOnly", false);
                           uiState.set("GetNext", this._isNext);
                           icmglobal.caseObject.onBroadcastEvent("icm.OpenWorkItem", {
                                  workItemEditable: icmWorkItemEditable,
                                  coordination: coordination,
                                  UIState: uiState
                                  //isLazy: this._inactivePage
                           });
                           /*  if (this._isNext) {
                          this._startCoordination(coordination, this);
                    }
                    this._isNext = false;*/
                     }));
                     //}));
              },

              _handleAssumeLockByOther: function(icmWorkItem) {
                     icmWorkItem.overrideLockStep(lang.hitch(this, function(){
                           var icmWorkItemEditable = icmWorkItem.createEditable();
                           var id = icmWorkItem.getCaseTaskId();
                           icmglobal._openItems[id] = true;
                           var uiState = new Stateful();
                           var coordination = new Coordination();
                           uiState.set("workItemReadOnly", false);
                           uiState.set("GetNext", this._isNext);
                           icmglobal.caseObject.onBroadcastEvent("icm.OpenWorkItem", {
                                  workItemEditable: icmWorkItemEditable,
                                  coordination: coordination,
                                  UIState: uiState

                           });
                           /*  if (this._isNext) {
                    this._startCoordination(coordination, this);
                }
                this._isNext = false;*/
                     }));
              },

              _startCoordination: function(coordination, itemHandler) {
                     var page = context.caseObject.page || context.caseObject;
                     coordination.step(Constants.CoordTopic.BEFORELOADWIDGET,
                                  function(results, next, skip,context){
                           itemHandler.logInfo("execute", "in BEFORELOADWIDGET step callback, results");
                           itemHandler.logInfo("execute", results);
                           next();
                     },
                     function(errors, next, skip){
                           itemHandler.logInfo("execute", "in BEFORELOADWIDGET step errback, errors");
                           itemHandler.logInfo("execute", errors);
                           itemHandler.showErrFromCoordinatorsDialog("actionExecutedErr", errors);
                           skip();
                     }
                     ).step(Constants.CoordTopic.LOADWIDGET,
                                  function(results, next, skip, context){
                           itemHandler.logInfo("execute", "in LOADWIDGET step callback, results");
                           itemHandler.logInfo("execute", results);
                           //set widget load timestamp
                           context.widgetLoadTime = new Date();
                           next();
                     },
                     function(errors, next, skip){
                           itemHandler.logInfo("execute", "in LOADWIDGET step errback, errors");
                           itemHandler.logInfo("execute", errors);
                           itemHandler.showErrDialog("actionExecutedErr", errors);
                           skip();
                     }
                     ).step(Constants.CoordTopic.AFTERLOADWIDGET,
                                  function(results, next, skip, context){
                           itemHandler.logInfo("execute", "in AFTERLOADWIDGET step callback, results");
                           itemHandler.logInfo("execute", results);
                           page.onBroadcastEvent("icm.WidgetLoaded", {"widgetLoadTime":context.widgetLoadTime});
                           next();
                     },
                     function(errors, next, skip){
                           itemHandler.logInfo("execute", "in AFTERLOADWIDGET step errback, errors");
                           itemHandler.logInfo("execute", errors);
                           itemHandler.showErrDialog("actionExecutedErr", errors);
                           skip();
                     }
                     ).start({});
              },

              /**
              * @private
              */
              showErrDialog: function(message_topic, errors) {
                     var text ="";
                     var messages= {};
                     var error;
                     var message;
                     var items;
                     var i, j;
                     var key;

                     for(i = 0; i < errors.length; i++){
                           if(errors[i][0] === false){
                                  error = errors[i][1];
                                  if(error !== undefined && error !== null && error.message !== undefined && error.message !== null){
                                         message= messages[error.message];
                                         if(!message){
                                                message = messages[error.message] = {};
                                         }
                                         items = error.items;
                                         if(items){
                                                for(j = 0; j < items.length; j++){
                                                       item = items[j];
                                                       message[item] = item;
                                                }
                                         }
                                  }
                           }
                     }

                     for(message in messages){
                           if(messages.hasOwnProperty(message)){
                                  text = text + "<br><br>&nbsp;<div style = 'font-weight: bold;'>" + message + "</div>";
                                  i = 0;
                                  for(key in messages[message]){
                                         if(messages[message].hasOwnProperty(key)){
                                                i++;
                                                if ( i <= 5){
                                                       text = text + "&nbsp;&nbsp;&nbsp;&nbsp;" + messages[message][key] + "<br>";
                                                }else{
                                                       text = text + "&nbsp;&nbsp;&nbsp;&nbsp;" + this.resourceBundle["Others"]  + "<br>";
                                                }
                                         }
                                  }
                           }
                     }

                     text = Message.createErrorMessage(message_topic, {explanation: text});

                     var errDialog = new ErrorDialog();
                     errDialog.showMessage(text);
              },
              openWorkItem:function(taskID){

                     icmglobal.self=this;
                     var that=this.caseObject;
                     icmglobal.caseObject=this.caseObject;
                     var id=taskID;
                     var fields = id.split(',');

                     var taskId = fields[2];
                     that.solution.retrieveTask(function (tasks){


                           var serverBase = window.location.protocol + "\/\/"+ window.location.host;
                           var rosterName = tasks.rosterName;
                           var workFlowName=tasks.taskTypeName;
                           var workFlowNumber=tasks.processInstanceId;
                           var connectionPoint=tasks.parentCase.caseType.solution.connectionPoint;
                           var postURL = serverBase+"/CaseManager/P8BPMREST/p8/bpm/v1/rosters/"+rosterName+"/wc/"+workFlowName+"/wob/"+workFlowNumber+"/?cp="+connectionPoint;

                           var xhrArgs = null;
                           xhrArgs = {
                                         url : postURL,
                                         handleAs : "json",
                                         sync : true,
                                         headers : {
                                                "Content-Type" : "application/json"
                                         },
                                         error : function(error) {

                                                alert("Work Item Not Found. Please contact administrator");
                                                console.log("Work Item Not Found. Please contact administrator"+ error);
                                         }
                           };

                           var deferred = dojo.xhrGet(xhrArgs);
                           var results = deferred.results;
                           var queue=results[0].systemProperties.milestones;
                           var fields = queue.split('/');
                           var queueName = fields[1];
                           if(queueName.substring(0,5)=="Inbox"){
                                	  queueName="Inbox(0)";
                           }

                           var taskedit = icm.model.TaskEditable.fromTask(tasks);

                           var properties = {};
                           properties["queueName"] = queueName;
                           properties["wobNum"] = tasks.processInstanceId;
                           properties.id = tasks.processInstanceId;
                           properties.name = queueName;
                           properties.repository = tasks.repository;
                           properties.connectionPoint = tasks.repository.connectionPoint;

                            if(queueName!=icmglobal.caseObject.widgetProperties.PublishQueueAccess.split(':')[0])
                           {
                                  var workitem = new ecm.model.WorkItem(properties);
                                  var icmWorkItem = icm.model.WorkItem.fromWorkItem(workitem);

                                  icmWorkItem.retrieveStep( function(item) {

                                         if(queueName === "Inbox(0)"){
                                                icmglobal.self._handleLockedByOtherReassign(icmWorkItem);

                                         }                                        
                                         else if (icmWorkItem.getLockedBy() !== "" && icmWorkItem.isLockedByCurrentUser() === false) {
                                                icmglobal.self._handleLockedByOther(icmWorkItem);
                                         }
                                         else if (icmWorkItem.getLockedBy() !== "" && icmWorkItem.isLockedByCurrentUser() === true) {
                                                icmglobal.self._handleAssumeLockBySame(icmWorkItem);
                                         }
                                         else if (icmWorkItem.getLockedBy() === "") {
                                                icmglobal.self._handleUnlocked(icmWorkItem);
                                         }
                                  });
                           }
                           else
                           {
                                  var dialog = new ecm.widget.dialog.MessageDialog({
                                         id: id,
                                         buttonLabel:"Information!",
                                         closeButtonLabel: "Close"
                                  });
                                  dialog.setSize(350, 200);
                                 dialog.showMessage(icmglobal.caseObject.widgetProperties.PublishQueueAccess.split(':')[1]);

                           }
                     },taskId);
              },
              openCase:function(caseID){


                     var that=this.caseObject;
                     var id=caseID;
                     var fields = id.split(',');

                     var caseId = fields[2];
                     that.solution.retrieveCase(caseId ,lang.hitch(this,function (cases){
                           var openCasePagePayload = {
                                         "caseEditable" : cases,
                                         "coordination" : new icm.util.Coordination()
                           };

                           cases.retrieveCachedAttributes(lang.hitch(this, function(cases) {
                                  var caseEditable = cases.createEditable();
                                  icmglobal.caseEditable=caseEditable;
                                  payload = { 
                                                "caseEditable": caseEditable
                                  };
                                  that.setActionContext("CaseReference", caseEditable, true);
                           }));

                           that.setActionContext("Case", cases, true);

                           that.cleanActionContext("Solution");
                           if(icmglobal.caseEditable)
                           {
                                  that.setActionContext("Solution", icmglobal.caseEditable.caseType.solution, true);                         
                                  // Refresh the list when the case object is changed
                                  that._connectCase(icmglobal.caseEditable);
                                  that.onCaseSelected(icmglobal.caseEditable);
                                  var openCasePagePayload = {
                                                "caseEditable" : icmglobal.caseEditable,
                                                "coordination" : new icm.util.Coordination()
                                  };
                                  that.onBroadcastEvent("icm.OpenCase", openCasePagePayload);
                           }
                     }));


              },
              formateDate:function(dateValue){

                     if(dateValue){
                           var newDate = new Date(dateValue);
                           var sMonth = newDate.getUTCMonth() + 1;
                           var sDay = newDate.getUTCDate();
                           var sYear = newDate.getUTCFullYear();
                           var sHour = newDate.getHours();
                           var sMinute = newDate.getMinutes();
                           if(sMinute<10){
                                  sMinute="0"+sMinute;}
                           var sAMPM = "AM";
                           var iHourCheck = parseInt(sHour);
                           if (iHourCheck > 12) {
                                  sAMPM = "PM";
                                  sHour = iHourCheck - 12;
                           }
                           else if (iHourCheck === 0) {
                                  sHour = "12";
                           }

                           var finalDate=sMonth + "/" + sDay + "/" + sYear;

                           return finalDate;
                     }
                     else
                     {
                           return null;
                     }

              },


              executeCaseSearch:function(repositoryId, ceQuery, taskQuery){
                     var self=this;
                     this._repositoryId = repositoryId;
                     var repository = ecm.model.desktop.getRepository(repositoryId);
                     this._ceQuery = ceQuery;
                     this._taskQuery = taskQuery;
                     this._searchTemplate = null;
                     var resultsDisplay = ecm.model.SearchTemplate.superclass.resultsDisplay;
                     resultsDisplay =[];
                     resultsDisplay.columns=[];
                     var sortBy = "";
                     var sortAsc = true;
                     var json='{'+resultsDisplay+'}';
                     this._searchQuery = new ecm.model.SearchQuery();
                     var json=JSON.parse(json);
                     this._searchQuery.repository = repository;
                     this._searchQuery.resultsDisplay = json;
                     this._searchQuery.query = ceQuery;

                     this._searchQuery.search(lang.hitch(this, function(results) {
                           var caseStore=results.items;
                            this.caseColumns=this.caseObject.widgetProperties.DeathMatchStatus.split(',');
                           this.lexisNexisCaseColumns =this.caseObject.widgetProperties.LexisNexisInfo.split(',');
                           this.caseStoreValue=caseStore;

                           this.executeTaskSearch(this._repositoryId, this._taskQuery);
                     }), sortBy, sortAsc);

              },
              executeTaskSearch:function(repositoryId, CEQuery){
                     var self=this;
                     this._repositoryId = repositoryId;
                     var repository = ecm.model.desktop.getRepository(repositoryId);
                     this._CEQuery = CEQuery;
                     this._searchTemplate = null;
                     var resultsDisplay = ecm.model.SearchTemplate.superclass.resultsDisplay;
                     resultsDisplay =[];
                     resultsDisplay.columns=[];
                     var sortBy = "";
                     var sortAsc = true;
                     var json='{'+resultsDisplay+'}';
                     this._searchQuery = new ecm.model.SearchQuery();
                     var json=JSON.parse(json);
                     this._searchQuery.repository = repository;
                     this._searchQuery.resultsDisplay = json;
                     this._searchQuery.query = CEQuery;
                     this._searchQuery.search(lang.hitch(this, function(results) {
                           var taskStore=results.items;
                           //     var taskColumns=this.caseObject.widgetProperties.TaskProperties.split(',');
                           var taskStoreValue = taskStore;  
                           this.displayGrid(this.caseStoreValue, taskStoreValue, this.caseColumns,this.lexisNexisCaseColumns,this.caseObject,this);

                     }), sortBy, sortAsc);

              },
              _eoc_:null
       });
});

