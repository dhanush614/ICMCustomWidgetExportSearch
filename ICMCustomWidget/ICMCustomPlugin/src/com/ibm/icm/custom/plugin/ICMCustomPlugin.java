package com.ibm.icm.custom.plugin;
import java.util.Locale;
import com.ibm.ecm.extension.Plugin;
import com.ibm.ecm.extension.PluginAction;

public class ICMCustomPlugin extends Plugin {

	@Override
	public String getId() {
		return "ICMCustomPlugin";
	}

	@Override
	public String getName(Locale arg0) {
		return "IBM Case Manager Custom plug-in";
	}

	@Override
	public String getVersion() {
		return "1.0.0";
	}

	@Override
	public PluginAction[] getActions() {
		return new PluginAction[] {
			new com.ibm.icm.custom.plugin.actions.ICMConfigCaseAction(),
			new com.ibm.icm.custom.plugin.actions.ICMCreateCaseAction(),
			new com.ibm.icm.custom.plugin.actions.ICMUnlockWorkitemAction(),
			new com.ibm.icm.custom.plugin.actions.ICMTerminateTaskAction(),
			new com.ibm.icm.custom.plugin.actions.ICMDeleteDocumentAction(),
			new com.ibm.icm.custom.plugin.actions.ICMExportCaseAction(),
			new com.ibm.icm.custom.plugin.actions.ICMPrintCaseAction(),
			new com.ibm.icm.custom.plugin.actions.ICMDispatchItemFromCaseSearchAction(),
			new com.ibm.icm.custom.plugin.actions.ICMExportCaseSearchAction(),
			new com.ibm.icm.custom.plugin.actions.ICMDispatchItemFromInbasket(),
			new com.ibm.icm.custom.plugin.actions.ICMExportCaseSummary(),
			new com.ibm.icm.custom.plugin.actions.ICMReopenTask(),
			new com.ibm.icm.custom.plugin.actions.ICMBulkUploadAction(),
			new com.ibm.icm.custom.plugin.actions.ICMGeneratePropertiesExcelAction(),
			new com.ibm.icm.custom.plugin.actions.ICMDownloadTemplate(),
			new com.ibm.icm.custom.plugin.actions.ICMBulkCaseCreationAction(),
			new com.ibm.icm.custom.plugin.actions.ICMSearchExportAction()
		};
	}

	@Override
	public String getScript() {
		return "ICMCustomPlugin.js";
	}

	@Override
	public String getDojoModule() {
		return null;
	}

	@Override
	public String getCSSFileName() {
		return "ICMCustomPlugin.css";
	}


}
