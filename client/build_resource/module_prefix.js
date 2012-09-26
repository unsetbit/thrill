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
