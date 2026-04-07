import { Link } from 'react-router-dom';
import ConnectionManagerView from '../../components/test';
import './settings.css';

const Settings = () => {
  return (
    <div style={{ padding: 20 }}>
      <Link to="/" className="btn-link">
        <span> ← Back</span>
      </Link>
      <div style={{ paddingInline: '20px' }}></div>
      <ConnectionManagerView />
    </div>
  );
};

export default Settings;
