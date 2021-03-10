define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"icm/action/Action",
	"ecm/widget/FilteringSelect",
	"dojo/data/ItemFileWriteStore",
	"icm/util/InbasketActionUtil"
], function(declare, lang, Action, FilteringSelect, ItemFileWriteStore, InbasketActionUtil ) {

	return declare("icmcustom.action.ICMDispatchItemFromInbasket", [Action], {
		selectWorkItems:null,
		solution:null,
		
		isEnabled: function(){
			// determine if the action is enabled or not
			// called during initialization and upon refresh (item selected, manual refresh...)

			var Solution = this.getActionContext("Solution");
			if(Solution === null || Solution.length == 0) {
				return false;
			}
			this.solution = Solution[0];
			var workitemList = this.getActionContext("WorkItem");
			var lenghtOfWorkItemSelected=workitemList.length;

			if(workitemList === null || lenghtOfWorkItemSelected == 0) {
				return false;
			}
			
			else{
				this.selectedWorkItem=workitemList[0];
				this.workitemList = workitemList;
				return true;
			}
		},
		execute: function(){
			
			var dispatchValueFlag = this.propertiesValue["dispatchValueFlag"];
			console.log("Dispatch Flag: "+dispatchValueFlag);
			/*var responseValue = this.propertiesValue["responseValue"];
			console.log("Response Value: "+responseValue);*/
			var currentWorkItems = this.getActionContext("WorkItem");
			if(dispatchValueFlag == "No" )
			{
				this.validateWorkItems(currentWorkItems);	
			}
			else
			{
				if(currentWorkItems.length > 1)
				{
					var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "Dispatch cannot be performed on multiple selected items."
					});
					messageDialog.show();
				}
				else
				{
					this.validateWorkItems(currentWorkItems);
				}
			}
		},
		
		validateWorkItems:function(selectWorkItems) {
			var currentUser = ecm.model.desktop.userId;
			console.log("Current User:"+currentUser);
            var canDispatch = [];
            var canNotDispatch = [];
            var i;
            for (i = 0; i < selectWorkItems.length; i++) {
                if ((selectWorkItems[i].ecmWorkItem.locked == false || (selectWorkItems[i].ecmWorkItem.locked == true && selectWorkItems[i].lockedUser.toLowerCase() == currentUser.toLowerCase()))) {
                    canDispatch.push(selectWorkItems[i]);
                } else {
                    canNotDispatch.push(selectWorkItems[i]);
                }
            }
			if(canNotDispatch.length > 0){
				var self = this;
				var confirmationDialog = new ecm.widget.dialog.ConfirmationDialog({
										title:"Do you want to dispath the workitems?",
										text: "Some items are locked by other users. Click on Ok to dispath the remaining workitems.",
										cancelButtonLabel:"Cancel",
										onExecute: function() {
											self.checkTheDispatchFlag(canDispatch);	
										},
										onCancel:function(){
											self.setEnabled(true);
											self.destroy();
										} 
									});

									confirmationDialog.show();
				}
				else
				{
					this.checkTheDispatchFlag(canDispatch);
			    }
		},
		checkTheDispatchFlag:function(canDispatch){
			var dispatchValueFlag = this.propertiesValue["dispatchValueFlag"];
			console.log("Dispatch Flag: "+dispatchValueFlag);
			var responseValue = this.propertiesValue["responseValue"];
			console.log("Response Value: "+responseValue);
			console.log("No of dispatchable items: "+canDispatch.length);
			var noOfWIE = canDispatch.length;
			if(noOfWIE > 0){
				if(dispatchValueFlag == "No")
					{
						console.log("Automatically dispatching the item based on given response from builder");
						for(var i=0;i<noOfWIE;i++){
							this.dispatchWorkItem(canDispatch[i],responseValue);
						}
					}
			else
			{
				if(noOfWIE >1){
					var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "Dispatch cannot be performed on multiple items."
					});
					messageDialog.show();
				}else
				{
				console.log("Manually do the dispatch by selecting the response");
				this.selectResponse(canDispatch);
				}
			}
			}else{
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "Dispatch cannot be performed on this workitem as it is locked by other user."
					});
					messageDialog.show();
			}
			
			
		},
		selectResponse: function(currentWorkItem)
		{
			//this.currentWorkItem1 = currentWorkItem;
			var dialogueBoxName="Select Response";
			var htmlstring='<div class="fieldsSection"><div class="fieldLabel"><span style="color:red" class="mandatory">**</span><label for="primaryInputFieldLabel">'+dialogueBoxName+':</label><div data-dojo-attach-point="primaryInputField"/></div><br></div>';
			var responseFlag=false;
			var response=currentWorkItem[0].responses;
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
							self.dispatchWorkItem(currentWorkItem[0],responseSelectedVal);						
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

		dispatchWorkItem:function(currentWorkItem,responseValue){
			var currentWIE = currentWorkItem.createEditable();
			
				currentWIE.lockStep(function(currentWIE) {
				try {
				currentWIE.saveStep(function(currentWIE){
				currentWIE.setSelectedResponse(responseValue);
				currentWIE.completeStep(function(currentWIE){
					/*try {
							var messageDialog = new ecm.widget.dialog.MessageDialog({
							text: "Item/Items has been dispatched Successfully"
						});
						messageDialog.show();
						}
						catch (Error) {
							alert(Error.name + " - " + Error.description + "\r\n" + Error.message);
						}*/
				},function(error){console.log("Error occured : "+ error);});
				},function(error){console.log("Error occured : "+ error);});
				}
				catch (Error) {
				alert(Error.name + " - " + Error.description + "\r\n" + Error.message);
				}
				});
			
		}
		
	});
});
