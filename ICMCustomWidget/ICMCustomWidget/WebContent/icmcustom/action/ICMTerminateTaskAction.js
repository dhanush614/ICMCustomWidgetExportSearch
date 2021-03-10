define([
	"dojo/_base/declare", 
	"icm/action/Action",
	"dojo/_base/lang",
	"icm/util/InbasketActionUtil"
	], function(declare, Action,lang,InbasketActionUtil) {

	return declare("icmcustom.action.ICMTerminateTaskAction", [Action], {

		selectWorkItems: null,

		solution: null,

		isEnabled: function()
		{
			var role=ecm.model.desktop.currentRole.name;
			var roleNames=this.propertiesValue.roleName;
			var roleNameArray=[];
			if(roleNames!="" && roleNames!=undefined)
			{
				roleNameArray=roleNames.split(',');
				if(!(roleNameArray.length>0 && roleNameArray.indexOf(role)>-1))
				{
					return false;
				}
			}

			var Solution = this.getActionContext("Solution");
			if(Solution === null || Solution.length == 0) {
				return false;
			}
			this.solution = Solution[0];
			var WorkItems = this.getActionContext("WorkItem");

			if(WorkItems === null || WorkItems.length == 0) {
				return false;
			}

			var flag=true;
			for (var i=0; i<WorkItems.length; i++)
			{
				/*Get a reference to the current work item*/
				var currentWorkItem = WorkItems[i];
				/*Check whether work item is locked*/
				if (currentWorkItem.lockedUser != "" && currentWorkItem.lockedUser != null)
				{
					/*If  locked, set variable to false and break out of the loop*/
					flag=false;
					break;
				}
			}

			if(WorkItems[0] instanceof icm.model.WorkItemEditable){
				var j = 0;
				for(j = 0; j < WorkItems.length; j++){
					this.selectWorkItems.push(WorkItems[0].getWorkItem());
				}
			}else{
				this.selectWorkItems = WorkItems;
			}

			return flag;
		},
		execute: function()
		{	
			var self=this;
			var confirmDialog = new ecm.widget.dialog.ConfirmationDialog({
				title: "Terminate Item",
				text: "Do you want to terminate the selected items?",

				onExecute: function() {
					self.terminateItem();
				},
				onCancel:function(){
					self.destroy();
				} 
			});

			confirmDialog.show();
		},
		terminateItem: function()
		{
			var totalItemCount = this.selectWorkItems.length;
			var loopCount=0;
			for (var k = 0; k < this.selectWorkItems.length; k++) {
				var currentWorkItem = this.selectWorkItems[k];
				currentWorkItem.retrieveAttributes(lang.hitch(this,function(currentWorkItem){
					var taskId=currentWorkItem.caseTaskId;
					this.solution.retrieveTask(lang.hitch(this,function(task){
						var taskEditable=task.createEditable();
						taskEditable.setStopped();
						taskEditable.save(lang.hitch(this,function() {
							loopCount=loopCount+1;
							if(totalItemCount==loopCount)
							{
								var workAssignRefresh = this.getActionContext("workAssignRefresh");
								if(workAssignRefresh){
									workAssignRefresh[0]();
								}
							}

						}));
					}),taskId);	
				}));

			}
		},

		_eoc_:null

	});

});

