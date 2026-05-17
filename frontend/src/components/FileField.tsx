type FileFieldProps = {
  accept: string;
  helper: string;
  label: string;
  onChange: (file: File | null) => void;
  selectedFile: File | null;
};

export function FileField({ accept, helper, label, onChange, selectedFile }: FileFieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-help">{helper}</span>
      <div className="file-field">
        <input
          accept={accept}
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          type="file"
        />
        <div className="file-field-copy">
          <p className="text-sm font-medium text-slate-900">{selectedFile ? selectedFile.name : `Choose ${label.toLowerCase()}`}</p>
          <p className="mt-1 text-sm text-slate-500">{selectedFile ? "File attached." : "Tap to browse."}</p>
        </div>
        <span className="file-field-action">Browse</span>
      </div>
    </label>
  );
}
