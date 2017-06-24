/**
 * Created by Александр on 28.08.2016.
 */
export default class Request {
    constructor (url, data, extra) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest(),
                params = '';

            if (data.method && typeof data.method === 'string') {
                data.method = data.method.toUpperCase();
            } else {
                data.method = 'GET';
            }

            if (!data.async && data.async !== false) {
                data.async = true;
            }

            if (!url) {
                return reject(new Error('No URL specified')) ;
            }

            if (data.method === 'GET' && data.body) {
                let paramsArray = [];
                Object.keys(data.body).forEach((key) => {
                    if (data.body[key]) {
                        paramsArray.push(key + '=' + data.body[key]);
                    }
                });

                if (paramsArray.length) {
                    url += '?' + paramsArray.join('&');
                }
            }

            xhr.open(data.method, url, data.async);

            if (extra.responseType) {
                xhr.responseType = extra.responseType;
            }

            if (data.headers) {
                for (let header in data.headers) {
                    if (data.headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header, data.headers[header]);
                    }
                }
            }

            xhr.onreadystatechange = () => {
                if (xhr.readyState !== 4) return;

                if (xhr.status !== 200) {
                    return reject(new Error(xhr.status + ': ' + xhr.statusText));
                } else {
                    if (data.json) {
                        return resolve(JSON.parse(xhr.responseText));
                    }
                    return resolve(xhr.responseText);
                }
            };

            if (data.json && data.method !== 'GET') {
                xhr.setRequestHeader('Accept', 'application/json');
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(data.json));
            } else {
                xhr.send(data.body);
            }
        })
    }
}

export function loadImage(url) {
    return new Request(url, {}, {responseType: 'blob'});
}
