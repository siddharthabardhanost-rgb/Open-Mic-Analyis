import { UploadCloud, X, File as FileIcon } from "lucide-react";
import React, { useCallback } from "react";
import { cn } from "../lib/utils";

interface FileDropzoneProps {
  files: File[];
  onFilesAdded: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  accept: string;
  label: string;
  multiple?: boolean;
}

export function FileDropzone({ files, onFilesAdded, onFileRemove, accept, label, multiple = true }: FileDropzoneProps) {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    const acceptedExtensions = accept.split(',').map(ext => ext.trim().toLowerCase());
    
    const filteredFiles = droppedFiles.filter(f => {
      const fileName = f.name.toLowerCase();
      return acceptedExtensions.some(ext => fileName.endsWith(ext));
    });

    if (filteredFiles.length > 0) {
      onFilesAdded(multiple ? [...files, ...filteredFiles] : filteredFiles.slice(0, 1));
    }
  }, [files, onFilesAdded, accept, multiple]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files) as File[];
      onFilesAdded(multiple ? [...files, ...selectedFiles] : selectedFiles.slice(0, 1));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
      <div 
        className={cn(
          "relative flex flex-col justify-center items-center p-6 border-2 border-dashed border-gray-300 rounded-2xl",
          "hover:border-blue-500 hover:bg-blue-50 transition-colors bg-white cursor-pointer"
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 text-center px-4">
          Drag & drop <b>{accept}</b> files here, or click to select
        </p>
        <input 
          type="file" 
          accept={accept} 
          multiple={multiple}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 truncate">{file.name}</span>
              </div>
              <button 
                onClick={() => onFileRemove(i)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
