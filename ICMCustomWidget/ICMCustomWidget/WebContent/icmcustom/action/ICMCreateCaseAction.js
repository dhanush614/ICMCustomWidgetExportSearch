define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/_base/array",
    "icm/action/Action",
    "icm/util/Coordination"
    ], function(declare, lang, array, Action, Coordination) {

	return declare("icmcustom.action.ICMCreateCaseAction", [Action], {executing: false,

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
			
			if (this.executing)
			{
				return false;
			}
			
			return true;
		},
		execute: function()
		{

			this.executing = true;
			var caseType = this.propertiesValue.caseType;
			var taskname = this.propertiesValue.TaskSubject;
			var taskType = this.widget.solution.prefix+"_"+this.propertiesValue.TaskNameLabel;
			if(caseType=="All"){
				this.logInfo("execute", "All case type not supported, only 1 case type is supported please contact administrator.");
				return false;
			}

			var caseProps=[];
			var casePropsValue=[];
			var taskProps=[];
			var taskPropsValue=[];
			var caseProperties=this.propertiesValue.CaseProps;
			var casePropertiesValue=this.propertiesValue.CasePropsValue;
			var taskProperties=this.propertiesValue.TaskProps;
			var taskPropertiesValue=this.propertiesValue.TaskPropsValue;
			var flagVal=this.propertiesValue.DiscretionaryFlag;
			if(caseProperties!="")
			{
				caseProps=caseProperties.split(','); 
			}
			if(casePropertiesValue!="")
			{
				casePropsValue=casePropertiesValue.split(','); 
			}
			if(taskProperties!="")
			{
				taskProps=taskProperties.split(','); 
			}
			if(taskPropertiesValue!="")
			{
				taskPropsValue=taskPropertiesValue.split(','); 
			}

			var solution=this.widget.solution;
			var self=this;

			solution.createNewCaseEditable(caseType,function(newCaseEditable){

				for(var i=0;i<caseProps.length;i++)
				{
					var casePropsHandler = newCaseEditable.propertiesCollection[caseProps[i]];
					if(casePropsHandler!=undefined)
					{
						casePropsHandler.setValue(casePropsValue[i]);
					}
				}

				newCaseEditable.save(lang.hitch(this,function(savedCaseEditable){
					if (flagVal!="No")
					{
						savedCaseEditable.caseObject.createNewTaskEditable(taskType, function(newTaskEditable){
							newTaskEditable.setTaskName(taskname);
							for(var j=0;j<taskProps.length;j++)
							{
								var taskPropsHandler = newTaskEditable.propertiesCollection[taskProps[j]];
								if(taskPropsHandler!=undefined)
								{
									taskPropsHandler.setValue(taskPropsValue[j]);
								} 

							}
							var addTaskPagePayload = {
									"taskEditable": newTaskEditable,
									"coordination": new icm.util.Coordination()
							};			 

							newTaskEditable.save();

							newCaseEditable.save(lang.hitch(this, function(caseEdit){
								var caseObj = caseEdit.caseObject;
								self._showCaseMessage(caseObj);

							}));
						});
					}
					else{
						var caseObj = savedCaseEditable.caseObject;
						self._showCaseMessage(caseObj);
					}
				}));
			});

		},

		_showCaseMessage:function(caseObj){

			var caseId=caseObj.caseIdentifier;

			var message= this.propertiesValue.casemessage;
			message=message.replace("caseid",caseId);
			alert(message);
			this.executing = false;
			this.setEnabled(true);
		},

		_eoc_:null
	});
});
