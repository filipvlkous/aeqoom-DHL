import { Link } from 'react-router-dom';
import ConnectionManagerView from '../../components/test';
import './settings.css';

const Settings = () => {
  return (
    <div>
      <Link to="/" className="btn-link">
        <span> ← Back</span>
      </Link>
      <div style={{ paddingInline: '20px' }} />
      <ConnectionManagerView />
    </div>
  );
};

export default Settings;
