const gulp = require('gulp');
const babel = require('gulp-babel');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const cleanCSS = require('gulp-clean-css');
const sourcemaps = require('gulp-sourcemaps');
var babelify = require('babelify');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

gulp.task('browser-sync', () => {
    browserSync.init({
        server: {
            baseDir: './',
        },
    });
});

gulp.task('js', () => {
    browserify('./src/js/index.js')
        .transform(babelify, { presets: ['es2015'] })
        .bundle()
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./public/js/'));
});

gulp.task('idb', () => {
    browserify('./src/js/utils/index.js')
        .transform(babelify, { presets: ['es2015'] })
        .bundle()
        .pipe(source('index.js'))
        .pipe(buffer())
        .pipe(gulp.dest('./public/js/utils/'));
});


// Styles
// gulp.task('styles', () => {
//         return gulp
//             .src('./src/css/styles.css')
//             .pipe(sourcemaps.init())
//             .pipe(autoprefixer())
//             .pipe(cleanCSS({compatibility: 'ie11'}))
//             .pipe(cleanCSS({level: '2'}))
//             .pipe(gulp.dest('./public/css/'));
//     },
// );

// Build task
gulp.task('build', ['js', 'idb'], () => {
    console.log('Building Project.');
});


// SERVER
var connect = require('gulp-connect');

gulp.task('connect', function() {
    connect.server({
        port: 7200,
    });
});

// DEFAULT + WATCH
gulp.task('default', ['connect', 'js'],() => {
    console.log('Starting watch task');
    gulp.watch('index.html').on('change', browserSync.reload);
    // gulp.watch('src/css/styles.css', ['styles']).on('change', browserSync.reload);
    gulp.watch('src/js/index.js', ['js']).on('change', browserSync.reload);
    gulp.watch('src/js/utils/index.js',['idb']).on('change', browserSync.reload);
});