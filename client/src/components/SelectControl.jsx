export default function SelectControl({ className = '', indicator = true, ...props }) {
  return <select
    {...props}
    className={`shared-select-control ${indicator ? 'has-indicator' : 'no-indicator'} ${className}`.trim()}
  />
}
