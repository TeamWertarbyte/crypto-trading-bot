import Configuration from './Configuration';
import validate from './Configuration.validator';
import * as config from '../../../config.json';

export const getConfig = (): Configuration => {
  // this will through a clear error if `value` is not of the
  // correct type. It will also fill in any default values
  return validate(config);
};
