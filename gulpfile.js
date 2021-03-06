// For development => gulp
// For production  => gulp -p

// Call Plugins
var env = require('minimist')(process.argv.slice(2)),
	gulp = require('gulp'),
	gutil = require('gulp-util'),
	jade = require('gulp-jade'),
	concat = require('gulp-concat'),
	browserify = require('gulp-browserify'),
	uglify = require('gulp-uglify'),
	gulpif = require('gulp-if'),
	stylus = require('gulp-stylus'),
	jeet = require('jeet'),
	rupture = require('rupture'),
	axis = require('axis-css'),
	prefixer = require('autoprefixer-stylus'),
	connect = require('gulp-connect'),
	modRewrite = require('connect-modrewrite'),
	imagemin = require('gulp-imagemin'),
	karma = require('gulp-karma'),
	through = require('through2'),
	path = require('path'),
	rsync = require('rsyncwrapper').rsync;

function jadeClientRename() {
  function transform(file, enc, callback) {
    if (!file.isBuffer()) {
      this.push(file);
      callback();
      return;
    }

    var funcName = path.basename(file.path, '.js');
    var from = 'function template(locals) {';
    var to = 'jade.tmpl["' + funcName + '"] = function (locals) {';
    var contents = file.contents.toString().replace(from, to);
    file.contents = new Buffer(contents);
    this.push(file);
    callback();
  }
  return through.obj(transform);
}


// Call Jade for compile Templates
gulp.task('jade', function() {
	return gulp.src('src/tmpl/**/*.jade')
		.pipe(jade({
			pretty: !env.p,
			client: true
		}))
    .pipe(jadeClientRename())
		.pipe(concat('tmpl.js'))
		.pipe(gulp.dest('build/js'))
		.pipe(connect.reload());
});

gulp.task('pages', function() {
	return gulp.src('src/pages/**/*.jade')
		.pipe(jade({
			pretty: !env.p,
		}))
		.pipe(gulp.dest('build/pages/'))
		.pipe(connect.reload());
});

// jade.index
gulp.task('index', function() {
	return gulp.src('src/index.jade')
		.pipe(jade({
			pretty: !env.p
		}))
		.pipe(gulp.dest('build/'))
		.pipe(connect.reload());
});

// Call Uglify and Concat JS
gulp.task('js', function() {
	return gulp.src('src/js/**/*.js')
		// .pipe(browserify({
		// 	debug: !env.p
		// }))
		.pipe(gulpif(env.p, uglify()))
		.pipe(concat('main.js'))
		.pipe(gulp.dest('build/js'))
		.pipe(connect.reload());
});

gulp.task('vendorjs', function() {
	return gulp.src('src/vendor/**/*.js')
		// .pipe(browserify({
		// 	debug: !env.p
		// }))
		.pipe(gulpif(env.p, uglify()))
		.pipe(concat('vendor.js'))
		.pipe(gulp.dest('build/js'))
		.pipe(connect.reload());
});


gulp.task('vendorcss', function() {
	return gulp.src('src/vendor/**/*.css')
		.pipe(concat('vendor.css'))
		.pipe(gulp.dest('build/css'))
		.pipe(connect.reload());
});


// Call Stylus
gulp.task('stylus', function() {
	gulp.src('src/styl/**/*.styl')
		.pipe(stylus({
			use: [axis(), prefixer(), jeet(), rupture()],
			compress: env.p
		}))
		.pipe(concat('main.css'))
		.pipe(gulp.dest('build/css'))
		.pipe(connect.reload());
});

// Call Imagemin
gulp.task('imagemin', function() {
	return gulp.src('src/img/**/*')
		.pipe(imagemin({
			optimizationLevel: 3,
			progressive: true,
			interlaced: true
		}))
		.pipe(gulp.dest('build/img'));
});

// Call Watch
gulp.task('watch', function() {
	gulp.watch('src/**/*.jade', ['jade', 'index', 'pages']);
	gulp.watch('src/**/*.styl', ['stylus']);
	gulp.watch('src/**/*.js', ['js']);
	gulp.watch('src/**/*.coffee', ['coffee']);
	// gulp.watch('src/img/**/*.{jpg,png,gif}', ['imagemin']);
});

// Connect (Livereload)
gulp.task('connect', function() {
	connect.server({
		root: ['build/'],
		livereload: true,
		middleware: function() {
			return [
				modRewrite([
					'^/$ /index.html',
					'^([^\\.]+)$ $1.html'
				])
			];
		}
	});
});

// Rsync
gulp.task('deploy', function() {
	rsync({
			ssh: true,
			src: './build/',
			dest: 'user@hostname:/path/to/www',
			recursive: true,
			syncDest: true,
			args: ['--verbose']
		},
		function(erro, stdout, stderr, cmd) {
			gutil.log(stdout);
		});
});

// Default task
gulp.task('default', ['index', 'vendorcss', 'vendorjs', 'js', 'pages', 'jade', 'stylus', 'imagemin', 'watch', 'connect']);
// Build and Deploy
gulp.task('build', ['index', 'vendorcss', 'vendorjs', 'js', 'pages', 'jade', 'stylus', 'imagemin', 'deploy']);
