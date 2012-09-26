/*! thrill - v0.0.1 - 2012-09-25
* Copyright (c) 2012 Ozan Turgut; Licensed  */

(function (exports) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exports; // CommonJS
  } else if (typeof define === "function") {
    define(exports); // AMD
  } else {
    thrill = exports; // <script>
  }
}((function () {
	var exports;

exports = {};
exports.Thrill = Thrill;
return exports;
}())));