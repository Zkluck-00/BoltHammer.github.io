const backendProtocol = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
const backendHost = window.location.hostname || 'localhost';

const API_URL = window.BOLT_API_URL
  || (window.location.port === '3000'
    ? '/api'
    : `${backendProtocol}//${backendHost}:3000/api`);
