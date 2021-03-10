define([
    "dojo/_base/declare",
    "icm/action/Action",
    "dojo/_base/lang",
    "icm/util/InbasketActionUtil"
], function(declare, Action, lang, InbasketActionUtil) {

    return declare("icmcustom.action.ICMConfigCaseAction", [Action], {

        selectWorkItems: null,

        solution: null,

        isEnabled: function() {
           var Solution = this.getActionContext("Solution");
            if (Solution === null || Solution.length == 0) {
                return false;
            } else {
                this.solution = Solution[0];
                return true;
            }
        },
        execute: function() {
            var solution = this.widget.solution;
            var params = {};
            var self = this.widget;
            var prefix = solution.getPrefix();
            params.ObjectStore = solution.getTargetOS().id;
            var criteriaValue = prefix + "_Configuration";

            var criterion1 = new ecm.model.SearchCriterion({
                "id": "CmAcmCaseIdentifier",
                "selectedOperator": "STARTSWITH",
                "dataType": "xs:string",
                "defaultValue": criteriaValue,
                "value": criteriaValue,
                "values": [criteriaValue]
            });

            params.criterions = [criterion1];
            params.CaseType = criteriaValue;
            params.solution = solution;
            var searchPayload = new icm.util.SearchPayload();
            searchPayload.setModel(params);
            console.debug(searchPayload);
            searchPayload.getSearchPayload(lang.hitch(this,function(payload) {
                console.debug(payload);
                console.debug(payload.searchTemplate);
                var searchTemplate = payload.searchTemplate;
                searchTemplate.search(lang.hitch(this,function(results) {
                    if (results.items.length > 0) {
                        var myItem = results.items[0];
                        var caseId = prefix + "_Configuration_" + myItem.name;
                        solution.retrieveCase(caseId,lang.hitch(this, function(currentCase) {
                            var cpayload = {};
                            cpayload.caseEditable = currentCase.createEditable();
                            cpayload.coordination = new icm.util.Coordination();
                            this.widget.onBroadcastEvent("icm.OpenCase", cpayload);
                        }));
                    } else {
                        solution.createNewCaseEditable(criteriaValue,lang.hitch(this, function(newCaseEditable) {
                            newCaseEditable.save(lang.hitch(this,function(savedCaseEditable) {
                                var outGoingPayload = {};
                                outGoingPayload.caseEditable = savedCaseEditable;
                                outGoingPayload.coordination = new icm.util.Coordination();
                                this.widget.onBroadcastEvent("icm.OpenCase", outGoingPayload);
                            }));

                        }));
                    }

                }));
            }));

        },

        _eoc_: null

    });

});