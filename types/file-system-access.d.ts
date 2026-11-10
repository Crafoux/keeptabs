// The part of the File System Access API that Keep Tabs uses. Chromium
// browsers support it, but TypeScript's DOM types do not include it yet.
// Type checking only: this file is not part of the extension.

interface SaveFilePickerAcceptType {
	description?: string;
	accept: Record<string, string | string[]>;
}

interface SaveFilePickerOptions {
	suggestedName?: string;
	startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos' | FileSystemHandle;
	types?: SaveFilePickerAcceptType[];
	excludeAcceptAllOption?: boolean;
	id?: string;
}

interface Window {
	showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
