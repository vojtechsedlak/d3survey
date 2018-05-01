var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync').create();
var jshint = require('gulp-jshint');
var browserify = require('browserify');
var del = require('del');
var concat = require('gulp-concat');
var runSequence = require('run-sequence');
//var ghPages = require('gulp-gh-pages');
var imagemin = require('gulp-imagemin');

var paths = {
	sass:'src/scss/',
	js:'src/js/',
	dist:'dist/',
	index:'dist/index.html'
}

gulp.task('clean:dist', function () {
    del.sync([
        paths.dist
    ]);
});

gulp.task('sass', function() {
	return gulp.src(`${paths.sass}/style.scss`)
		.pipe(sass())
		.pipe(gulp.dest(`${paths.dist}/css`))
		.pipe(browserSync.reload({ stream: true }))
});

gulp.task('scripts', function() {
	return gulp.src(`${paths.js}/*.js`)
		.pipe(jshint())
    	.pipe(concat('main.js'))
		.pipe(gulp.dest(`${paths.dist}/js`))
		.pipe(browserSync.reload({ stream: true }))
});

gulp.task('copy', [
    'copy:jquery',
    'copy:bootstrap-css',
    'copy:bootstrap-js',
    'copy:assets',
    'copy:d3',
    'copy:adminLTE-css',
    'copy:adminLTE-js',
    'copy:adminLTE-skin'
]);

gulp.task('copy:assets', () =>
	gulp.src(['src/assets/**/*'])
		.pipe(gulp.dest(`${paths.dist}/assets`))
);

gulp.task('copy:jquery', () =>
    gulp.src(['node_modules/jquery/dist/jquery.min.js'])
        .pipe(gulp.dest(`${paths.dist}/js/vendor`))
);

gulp.task('copy:bootstrap-js', () =>
    gulp.src(['node_modules/bootstrap/dist/js/bootstrap.min.js'])
        .pipe(gulp.dest(`${paths.dist}/js/vendor`))
);

gulp.task('copy:bootstrap-css', () =>
	gulp.src(['node_modules/bootstrap/dist/css/bootstrap.min.css'])
    	.pipe(gulp.dest(`${paths.dist}/css/vendor`))
);

gulp.task('copy:d3', () =>
	gulp.src(['node_modules/d3/dist/d3.min.js*'])
    	.pipe(gulp.dest(`${paths.dist}/js/vendor`))
);

gulp.task('copy:adminLTE-css', () =>
	gulp.src(['node_modules/admin-lte/dist/css/AdminLTE.min.css*'])
    	.pipe(gulp.dest(`${paths.dist}/css/vendor`))
);

gulp.task('copy:adminLTE-skin', () =>
	gulp.src(['node_modules/admin-lte/dist/css/skins/_all-skins.min.css*'])
    	.pipe(gulp.dest(`${paths.dist}/css/vendor`))
);

gulp.task('copy:adminLTE-js', () =>
	gulp.src(['node_modules/admin-lte/dist/js/adminlte.min.js*'])
    	.pipe(gulp.dest(`${paths.dist}/js/vendor`))
);

gulp.task('html', function(){
  return gulp.src('src/*')
    .pipe(gulp.dest('dist'))
});

gulp.task('browserSync', function() {
	browserSync.init({
		server: {
			baseDir: paths.dist
		}
	})
});  
 
gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages());
});

gulp.task('build', function(callback) {
	runSequence(
		'clean:dist', 
		'scripts',
		'copy',
		'sass',
		'html',
		callback)
});

gulp.task('watch', ['browserSync', 'sass', 'scripts'], function() {
	gulp.watch(`${paths.sass}/*.scss`, ['sass']);
	gulp.watch(`${paths.js}/*.js`, ['scripts']);
	gulp.watch('src/*.html',['html']);
	gulp.watch('dist/*.html',browserSync.reload);
})