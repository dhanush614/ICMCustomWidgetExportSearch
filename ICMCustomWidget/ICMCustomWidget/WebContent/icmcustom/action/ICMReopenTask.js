define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"icm/action/Action",
	"icm/model/properties/controller/ControllerManager",
], function(declare, lang, Action, ControllerManager) {

	return declare("icmcustom.action.ICMReopenTask", [Action], {
		selectWorkItems: null,
		solution: null,

		isEnabled: function() {
			// determine if the action is enabled or not
			// called during initialization and upon refresh (item selected, manual refresh...)
			var Solution = this.getActionContext("Solution");
			if (Solution === null || Solution.length == 0) {
				return false;
			}
			else {
				return true;
			}
		},

		execute: function() {
			_self = this;
			var taskNames = this.propertiesValue["taskNameValues"];
			var taskNameArray = taskNames.split(",");
			var caseObject = this.getActionContext("Case");
			this.validCount = 0;
			this.inValidCount = 0;
			this.taskNameCount = 0;
			if (taskNameArray.length > 0) {

				for (var i = 0; i < caseObject.length; i++) {
					this.reopenTask(taskNameArray, caseObject[i]);
				}
			}
			else {
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Please contact your administrator to pass the Task Type Value</b> "
				});
				messageDialog.show();
			}


		},

		reopenTask: function(taskNameArray, caseObject) {
			console.log(this.validCount+" "+this.inValidCount);
			caseObject.retrieveTasks(lang.hitch(this, function(tasks) {
				this.count = tasks.length;
				this.validCount = 0;
				this.flag = false;
				for (var w = 0; w < tasks.length; w++) {
					tasks[w].retrieveAttributes(lang.hitch(this, function(item) {
						if (taskNameArray.indexOf(item.taskTypeName) > -1) {
							if (item.taskState == 5 || item.taskState == 6) {

								item.restart(function(newtask) {
									console.log("Task has been restarted");
								});
								var caseEditable = caseObject.createEditable();								
								caseEditable.retrieveAttributes(function(retrievedCaseObj) {
									var caseStateController=retrievedCaseObj.propertiesCollection.CmAcmCaseState;
									caseStateController.setValue(2);
									retrievedCaseObj.save(function(savedCase) {
										this.validCount = this.validCount + 1;
										console.log("Valid Count: ",this.validCount);
										if (this.count == this.validCount + this.inValidCount + this.taskNameCount) {
											this.showDialogMessage();
										}
									});

								});
							} else {
								this.inValidCount = this.inValidCount + 1;
								console.log("inValidCount: "+this.inValidCount);
								if (this.count == this.validCount + this.inValidCount + this.taskNameCount) {
									this.showDialogMessage();
								}
							}
						}
						else {
							this.taskNameCount = this.taskNameCount + 1;
							console.log("TaskNamCount: "+this.taskNameCount);
							if (this.count == this.validCount + this.inValidCount + this.taskNameCount) {
								this.showDialogMessage();
							}
						}
					}));
				}

			}));
		},
		showDialogMessage: function() {
			console.log("Valid Count inValid Count TaskName Count:"+this.validCount+" "+this.inValidCount+" "+this.taskNameCount);
			if (this.inValidCount > 0 && this.validCount == 0) {
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Reopen on working cases is not allowed </b> "
				});
				messageDialog.show();
			} else if (this.inValidCount > 0 && this.validCount > 0) {
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Reopen on some of the cases is not allowed. </b> "
				});
				messageDialog.show();
			} else if (this.inValidCount == 0 && this.validCount > 0) {
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Reopen is completed successfully. </b> "
				});
				messageDialog.show();
			} else if (this.taskNameCount  > 0 && this.validCount >0  ) {
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Some of the tasks not restarted.</b> "
				});
				messageDialog.show();
			} else if(this.taskNameCount  == 0 ){
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Task Type does not match, hence no action taken.</b> "
				});
				messageDialog.show();
			}else {
				var messageDialog = new ecm.widget.dialog.MessageDialog({
					text: "<b>Some condition is missing. Please check once.</b> "
				});
				messageDialog.show();
			}
		},

	});
});

