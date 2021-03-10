package com.ibm.icm.custom.plugin.actions;

import java.io.IOException;
import java.util.Locale;

import com.ibm.ecm.extension.PluginAction;
import com.ibm.json.java.JSONObject;

public class ICMPrintCaseAction extends PluginAction {

	@Override
	public String getId() {
		return "custom.ICMPrintCaseAction";
	}

	@Override
	public String getName(Locale locale) {
		return "ICM Print Case Action";
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
		return "icmcustom.action.ICMPrintCaseAction";
	}

	@Override
	public JSONObject getAdditionalConfiguration(Locale locale) {
		String jsonString = "{\r\n" +
				"	        \"ICM_ACTION_COMPATIBLE\": true,\r\n" +
				"	        \"context\": null,\r\n" +
				"            \"name\": \"ICM Print Case Action\",\r\n" +
				"	    \"description\": \"An action to print case properties and comments\",\r\n" +
				"            \"properties\": [\r\n" +
				"                {\r\n" +
				"                    \"id\": \"label\",\r\n" +
				"                    \"title\": \"Label\",\r\n" +
				"                    \"defaultValue\": \"Print Case\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"                {\r\n" +
				"                    \"id\": \"iscomment\",\r\n" +
				"                    \"title\": \"Need Comments Alert\",\r\n" +
				"                    \"defaultValue\": \"No\",\r\n" +
				"                    \"type\": \"choicelist\",\r\n" +
				"                    \"options\": [{\"id\": \"Yes\",\"title\": \"Yes\"},{\"id\": \"No\",\"title\": \"No\"}],\r\n"+
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"contextTypeValue\",\r\n" +
				"                    \"title\": \"Context Type\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"defaultValue\": \"WorkItem\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"printPageDisplayTitle\",\r\n" +
				"                    \"title\": \"Print Title\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"defaultValue\": \"Case Properties\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"casePropertyLabel\",\r\n" +
				"                    \"title\": \"Case Property Label\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"defaultValue\": \"Case Properties\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"dateproperties\",\r\n" +
				"                    \"title\": \"Date Properties\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"caseproperties\",\r\n" +
				"                    \"title\": \"Case Properties\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"displayproperties\",\r\n" +
				"                    \"title\": \"Display Properties\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"text\",\r\n" +
				"                    \"title\": \"Text Message\",\r\n" +
				"                    \"defaultValue\": \"Do you want to Print Comments?\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"ExportText\",\r\n" +
				"                    \"title\": \"Text Message\",\r\n" +
				"                    \"defaultValue\": \"Do you want to Export Comments?\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"filePrefix\",\r\n" +
				"                    \"title\": \"File Prefix\",\r\n" +
				"                    \"defaultValue\": \" \",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"cancelButtonLabel\",\r\n" +
				"                    \"title\": \"Cancel Button Label\",\r\n" +
				"                    \"defaultValue\": \"No\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"windowHeight\",\r\n" +
				"                    \"title\": \"Window Height\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"windowWidth\",\r\n" +
				"                    \"title\": \"Window Width\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"multiValueCaseProperties\",\r\n" +
				"                    \"title\": \"Multi Value Case Properties\",\r\n" +
				"                    \"defaultValue\": \"NA\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"multiValueDisplayProperties\",\r\n" +
				"                    \"title\": \"Multi Value Display Properties\",\r\n" +
				"                    \"defaultValue\": \"NA\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"commaValues\",\r\n" +
				"                    \"title\": \"Comma Seperated Value Properties\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"numberValues\",\r\n" +
				"                    \"title\": \"Number Value Properties\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"multiValuePropertyTableLabel\",\r\n" +
				"                    \"title\": \"Multi Value Property Table Label\",\r\n" +
				"                    \"defaultValue\": \"NA\",\r\n" +
				"                    \"type\": \"string\",\r\n" +
				"                    \"isLocalized\":false\r\n" +
				"                },\r\n" +
				"				 {\r\n" +
				"                    \"id\": \"width\",\r\n" +
				"                    \"title\": \"Width and Height\",\r\n" +
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
