define([
	"dojo/_base/declare", 
	"dojo/_base/lang",
	"icm/action/Action",
	"ecm/widget/FilteringSelect",
	"dojo/data/ItemFileWriteStore",
	"icm/util/InbasketActionUtil"
	], function(declare, lang, Action, FilteringSelect, ItemFileWriteStore, InbasketActionUtil) {

	return declare("icmcustom.action.ICMDispatchItemFromCaseSearchAction", [Action], {
		selectCases: null,

		solution: null,

		isEnabled: function()
		{
			// determine if the action is enabled or not
			// called during initialization and upon refresh (item selected, manual refresh...)

			var Solution = this.getActionContext("Solution");
			if(Solution === null || Solution.length == 0) {
				return false;
			}
			this.solution = Solution[0];

			var caseList = this.getActionContext("Case");
			var lenghtOfCaseSelected=caseList.length;

			if(caseList === null || lenghtOfCaseSelected == 0) {
				return false;
			}
			else{
				this.selectedCase=caseList[0];
				return true;
			}	

		},
		execute: function()
		{		
			var currentCase = this.selectedCase;
			currentCase.retrieveAttributes(lang.hitch(this, function(caseAttribute) {
				if(caseAttribute.attributes.CmAcmCaseState==2)
				{
					this.retrieveWorkitem();
				}
				else{
					var messageDialog = new ecm.widget.dialog.MessageDialog({
						text: "Action cannot be performed on the selected case, since the case is completed"
					});
					messageDialog.show();				
				}
			}));
		},
		retrieveWorkitem:function()
		{
			this.cleanActionContext("WorkItem");
			this.cleanActionContext("WorkItemReference");
			var taskTypeName=this.propertiesValue.taskTypeName;
			if(taskTypeName!="" && taskTypeName!=null)
			{					
				var taskTypeArray=taskTypeName.split(",");
				var currentCaseObj = this.selectedCase;
				currentCaseObj.retrieveTasks(lang.hitch(this, function(tasks) {
					for (var w = 0; w < tasks.length; w++) {

						if(taskTypeArray.indexOf(tasks[w].taskTypeName) > -1)
						{
							tasks[w].retrieveAttributes(lang.hitch(this, function(item) {

								if(item.attributes.TaskState==4)
								{
									var soln=ecm.model.desktop.currentSolution;
									var serverBase = window.location.protocol + "\/\/"+ window.location.host;
									var rosterName=item.rosterName;
									var workFlowName=item.taskTypeName;
									var workFlowNumber=item.attributes.CmAcmProcessInstanceId;
									var connectionPoint=ecm.model.desktop.currentSolution.connectionPoint;
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
									if(queueName.substring(0,5)=="Inbox")
									{	
										queueName="Inbox(0)";
									}
									if(queueName!=null && queueName!=undefined && queueName!="")
									{
										soln.retrieveWorkItem(queueName,workFlowNumber,lang.hitch(this,function(workitem){
											this.setActionContext("WorkItem", workitem, true);
											this.setActionContext("WorkItemReference", workitem, true);
											this.validateWorkitem();

										}));
									}
								}
								else{
									var messageDialog = new ecm.widget.dialog.MessageDialog({
										text: "Iterms are already dispatched, No items found for this case."
									});
									messageDialog.show();	
								}
							}));
						}
					}
				}));
			}
		},
		validateWorkitem: function()
		{	
			var currentUser = ecm.model.desktop.userId;			
			var WorkItems = this.getActionContext("WorkItem")[0];
			var lockedFlag=false;
			var currentWorkItem = WorkItems;
			if (currentWorkItem.lockedUser == "" || currentWorkItem.lockedUser == null)
			{
				lockedFlag=false;
			}
			else if(currentWorkItem.lockedUser.toUpperCase() != currentUser.toUpperCase()){
				lockedFlag=false;
			}
			else{
				lockedFlag=true;
			}

			if(lockedFlag)
			{
				this.cleanActionContext("WorkItem");
				this.cleanActionContext("WorkItemReference");
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "Action cannot be performed on the selected item since the item is locked by other user"
				});
				messageDialog.show();
			}
			else{
				this.selectResponse();
			}

		},
		selectResponse: function()
		{
			var dialogueBoxName="Select Response";
			var htmlstring='<div class="fieldsSection"><div class="fieldLabel"><span style="color:red" class="mandatory">**</span><label for="primaryInputFieldLabel">'+dialogueBoxName+':</label><div data-dojo-attach-point="primaryInputField"/></div><br></div>';
			var itemsCanDispatch=this.getActionContext("WorkItem")[0];
			this.workitem=itemsCanDispatch;
			var responseFlag=false;
			var response=this.workitem.responses;
			var self=this;
			if(response.length>0)
			{	
				responseFlag=true;
				var responseList=[];
				var data = {
						items:[]    
				};

				for(var i=0;i<response.length;i++)
				{
					responseList.push({
						id :response[i],value :response[i]
					});
				}

				for(var l=0; l<responseList.length; l++){
					data.items.push(responseList[l]);
				}
				var typeStore = new dojo.data.ItemFileWriteStore({data: data});

				this.initiateTaskDialog = new ecm.widget.dialog.BaseDialog({
					cancelButtonLabel:"Cancel",
					contentString:htmlstring,
					addPrimaryCategory: function(){
						var displayName = (new Date()).getTime() + "primaryInputField"; 
						this._primaryInputField=new FilteringSelect({
							displayName: displayName,
							name:"primaryInputField",
							store:typeStore,
							autoComplete: true,
							style: {
								width: "200px"
							},
							placeHolder:'Select the required response',
							required: true,
							searchAttr: "value"
						});
						this._primaryInputField.placeAt(this.primaryInputField);
						this._primaryInputField.startup();
					},
					onExecute: function() {
						var responseSelectedVal=this._primaryInputField.value;
						if(responseSelectedVal!="")
						{
							self.dispatchWorkitem(responseFlag,responseSelectedVal);						
						}
						else{
							var messageDialog = new ecm.widget.dialog.MessageDialog({
								text: "No response selected hence no action will be taken"
							});
							messageDialog.show();
						}
					}
				});

				this.initiateTaskDialog.setTitle("Select Response");
				this.initiateTaskDialog.setSize(300,300);
				this.initiateTaskDialog.setResizable(true);
				this.initiateTaskDialog.addPrimaryCategory();
				this.initiateTaskDialog.addButton("Ok",this.initiateTaskDialog.onExecute,false,false);
				this.initiateTaskDialog.show();
			}
			else{
				this.dispatchWorkitem(responseFlag,null);
			}
		},
		dispatchWorkitem: function(responseFlag,responseSelectedVal)
		{

			var wrkitemEditable=this.workitem.createEditable();
			wrkitemEditable.lockStep(function(wrkitemEditable){
				try {
					wrkitemEditable.saveStep(function(currentWIE){
						if(responseFlag)
						{
							currentWIE.setSelectedResponse(responseSelectedVal);
						}
						currentWIE.completeStep(function(currentWIE){
							try {

								var messageDialog = new ecm.widget.dialog.MessageDialog({
									text: "Item has been dispatched Successfully"
								});
								messageDialog.show();
							}
							catch (Error) {
								alert(Error.name + " - " + Error.description + "\r\n" + Error.message);
							}
						},function(error){
							console.log("Error occured : "+ error); });
					},function(error){
						console.log("Error occured : "+ error); });
				}
				catch (Error) {
					console.log(Error.name + " - " + Error.description + "\r\n" + Error.message);
				}
			});

		},
		_eoc_:null

	});

});

