var gulp = require("gulp");
var browserify = require("gulp-browserify-thin");
var header = require("gulp-header");
var manifest = require("./package.json");

var HEADER = "/**\n" +
             " * <%= name %> - <%= version %>\n" +
             " * <%= homepage %>\n" +
             " * MPL 2.0 License, copyright (c) 2015 Jordan Santell\n" +
             " */\n";

gulp.task("default", function () {
  var b = browserify({ standalone: "Prole" }).add("./index.js");
  var stream = b.bundle("prole.js")
    .pipe(header(HEADER, manifest))
    .pipe(gulp.dest("./build"));

  return stream;
});
