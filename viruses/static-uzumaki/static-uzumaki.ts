import TVStaticLoading from '../../components/TVStaticLoading';
import { startUzumakiBackground } from '../../utils/uzumaki-colors';
import './static-uzumaki.scss';

// Initialize TV static effect
const tvStatic = new TVStaticLoading();
tvStatic.show();

startUzumakiBackground();
