export * from './cocos';
export * from './loader';

cc.loader.register(['skel'], {
  // định nghĩa cho file .skel
  // kiểu resource (tùy bạn, có thể để "binary")
  TYPE: { skel: 'binary' },
  load: function (realUrl, url, res, callback) {
    cc.loader.loadBinary(url, function (err, data) {
      // console.log('loadBinary Skeleton', realUrl, url, res, data, callback)
      if (err) {
        callback(err)
        return
      }
      callback(null, data)
    })
  },
})
