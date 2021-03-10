package com.ibm.icm.custom.plugin.actions;

import java.io.IOException;
import java.util.Locale;

import com.ibm.ecm.extension.PluginAction;
import com.ibm.json.java.JSONObject;

public class ICMCreateCaseAction extends PluginAction {

	@Override
	public String getId() {
		return "custom.ICMCreateCaseAction";
	}

	@Override
	public String getName(Locale locale) {
		return "ICM Create Case Action";
	}

	@Override
	public String getIcon() {
		return "";
	}

	@Override
	public String getPrivilege() {
		return "";
	}

	@Override
	public String getServerTypes() {
		return "p8,cm";
	}

	@Override
	public String getActionFunction() {
		return "";
	}

	@Override
	public boolean isMultiDoc() {
		return false;
	}

	@Override
	public boolean isGlobal() {
		return false;
	}

	@Override
	public String getActionModelClass() {
		return "icmcustom.action.ICMCreateCaseAction";
	}

	@Override
	public JSONObject getAdditionalConfiguration(Locale locale) {
		String jsonString = "{\r\n" +
				"	        \"ICM_ACTION_COMPATIBLE\": true,\r\n" +
				"	        \"context\": null,\r\n" +
				"            \"name\": \"ICM Create Case Action\",\r\n" +
				"	    \"description\": \"An action to create a case\",\r\n" +
				"            \"properties\": [\r\n" +
				"                {\r\n" +
				"                    \"id\": \"label\",\r\n" +
				"                    \"title\": \"Label\",\r\n" +
				"                    \"defaultValue\": \"Create Case\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"roleName\",\r\n" +
				"                    \"title\": \"List of Role Name\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"casemessage\",\r\n" +
				"                    \"title\": \"Case Message\",\r\n" +
				"                    \"defaultValue\": \"Case is created and your Case ID is :caseid\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"caseType\",\r\n" +
				"                    \"title\": \"Case Type\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"caseType\"\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"CaseProps\",\r\n" +
				"                    \"title\": \"List of Case Properties\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"CasePropsValue\",\r\n" +
				"                    \"title\": \"List of Values of Case Properties\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"DiscretionaryFlag\",\r\n" +
				"                    \"title\": \"Is Discretionary task needs to be initiated?\",\r\n" +
				"                    \"defaultValue\":\"No\",\r\n" +
				"                    \"type\": \"choicelist\",\r\n" +
				"                    \"options\": [{\"id\": \"Yes\",\"title\": \"Yes\"},{\"id\": \"No\",\"title\": \"No\"}],\r\n"+
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"TaskNameLabel\",\r\n" +
				"                    \"title\": \"Task Name\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"TaskSubject\",\r\n" +
				"                    \"title\": \"Task Subject\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"TaskProps\",\r\n" +
				"                    \"title\": \"List of Task Properties\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"TaskPropsValue\",\r\n" +
				"                    \"title\": \"List of Values of Task Properties\",\r\n" +
				"                    \"defaultValue\": \"\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"            ],\r\n" +
				"            \"events\":[]" +
				"	}";
				try {
			return JSONObject.parse(jsonString);
		} catch (IOException e) {
			e.printStackTrace();
		}
		return null;
	}
}
