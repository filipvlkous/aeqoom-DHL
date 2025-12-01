export default function KeyboardShortcuts() {
  return (
    <div className="shortcuts-container bg-blue-50  border-blue-200 rounded-lg  p-3">
      <p className="text-xs text-blue-700 font-medium mb-1">
        Keyboard Shortcuts
      </p>
      <p className="text-xs text-blue-600">
        Press{' '}
        <kbd className="bg-white px-1 py-0.5 rounded text-blue-800 font-mono">
          P
        </kbd>{' '}
        to capture photo
      </p>
      <p className="text-xs text-blue-600">
        Press{' '}
        <kbd className="bg-white px-1 py-0.5 rounded text-blue-800 font-mono">
          A
        </kbd>{' '}
        to add items
      </p>
      <p className="text-xs text-blue-600">
        Press{' '}
        <kbd className="bg-white px-1 py-0.5 rounded text-blue-800 font-mono">
          S
        </kbd>{' '}
        to send data
      </p>
    </div>
  );
}
