# Reaction Commerce Buildpack

This buildpack is a fork of [meteor-buildpack-horse](https://github.com/swrdfish/meteor-buildpack-horse.git) with our
modifications to ease deployment and overcome common failures (like boot timeout).

To use this with heroku:

1. Set up your app to [deploy to heroku with git](https://devcenter.heroku.com/articles/git).
2. Set this repository as the buildpack URL:

        heroku buildpacks:set https://github.com/Zanobo/reaction-buildpack.git

3. Add the MongoLab addon:

        heroku addons:create mongolab

4. Set the `ROOT_URL` environment variable. This is required for bundling and running the app.  Either define it explicitly, or enable the [Dyno Metadata](https://devcenter.heroku.com/articles/dyno-metadata) labs addon to default to `https://<appname>.herokuapp.com`.

        heroku config:set ROOT_URL="https://<appname>.herokuapp.com" # or other URL

Once that's done, you can deploy your app using this build pack any time by pushing to heroku:

    git push heroku master

## Environment

The following are some important environment variables for bundling and running your meteor app on heroku.  Depending on your settings, you may need to override these on heroku.  See [heroku's documentation](https://devcenter.heroku.com/articles/config-vars) for how to set these.

 - `ROOT_URL`: The root URL for your app, needed for bundling as well as running. If you enable the [Dyno Metadata](https://devcenter.heroku.com/articles/dyno-metadata) labs addon and `ROOT_URL` is undefined, it will default to `https://<appname>.herokuapp.com`).
 - `MONGO_URL`: The URL to mongodb.  It not defined, it will default the value of `MONGODB_URI`, `MONGOLAB_URI`, or `MONGOHQ_URL` (in order).  If you don't use mongolab as a regular addon (and none of the fallbacks are defined), you'll need to set this.
 - `METEOR_APP_DIR`: The relative path to the root of your meteor app within your git repository (i.e. the path to the directory that contains `.meteor/`). The buildpack will look in the root of your repository and `app/` subdirectory; if you put your app anywhere else (like `src/`), define this variable to tell the buildpack where to look.
 - `BUILDPACK_PRELAUNCH_REACTION`: If your app uses packages that need to compile their assets on first run, you may need reaction to launch prior to bundling.  If this applies for you, define `BUILDPACK_PRELAUNCH_REACTION=1`. [Reference issue](https://github.com/meteor/meteor/issues/2606).
 - `REACTION_TIMEOUT`: If BUILDPACK_PRELAUNCH_REACTION is set wait for this many seconds before killing Reaction.
   Defaults to 600 (10 minutes).
 - `BUILDPACK_VERBOSE`: Set `BUILDPACK_VERBOSE=1` to enable verbose bash debugging during slug compilation. Only takes effect after the environment variables have been loaded.
 - `BUILDPACK_CLEAR_CACHE`: This buildpack stores the meteor installation in the [CACHE_DIR](https://devcenter.heroku.com/articles/buildpack-api#caching) to speed up subsequent builds. Set `BUILDPACK_CLEAR_CACHE=1` to clear this cache on startup.
 - `BUILD_OPTIONS`: Set to any additional options you'd like to add to the invocation of `meteor build`, for example `--debug` or `--allow-incompatible-update`.

### Boot proxy

Sometimes reaction takes too much time to start and Heroku thinks that there's a problem with your app. To sidestep this
we have a simple proxy that answers every request until it's ready.

It accepts the following environment variables:

 - `USE_BOOT_PROXY`: Set `USE_BOOT_PROXY=1` to enable it. It's disabled by default.
 - `PING_PATH`: The route we use to test if your app is ready. Defaults to `/`. You need to add a leading slash.
 - `PING_INTERVAL`: Interval between probes, in seconds. Defaults to 1 second.
 - `BOOT_TIMEOUT`: Maximum time to wait for your app in seconds. Defaults to 3600 (1 Hour). If reached we exit with an
   error.
 - `BOOTING_URL`: Proxies transparently to this url while your app is booting if provided.

## Extras

The basic buildpack should function correctly for any normal-ish meteor app,
with or without npm-container.  For extra steps needed for your particular build,
just add shell scripts to the `extra` folder and they will get sourced into the 
build.

Extras included in this branch:
 - `mongo_url.sh`: If `MONGO_URL` is empty, set it to the value of `MONGODB_URI`, `MONGOLAB_URI`, or `MONGOHQ_URL` (in order).
 - `root_url.sh`: If `ROOT_URL` is empty and `HEROKU_APP_NAME` is available, set `ROOT_URL` to `https://$HEROKU_APP_NAME.herokuapp.com`

## Where things go

This buildpack creates a directory `.meteor/heroku_build` (`$COMPILE_DIR`)
inside the app checkout, and puts all the binaries and the built app in there.
So it ends up having the usual unixy `bin/`, `lib/`, `share` etc
subdirectories.  Those directories are added to `$PATH` and
`$LD_LIBRARY_PATH` appropriately.

So `$COMPILE_DIR/bin` etc are great places to put any extra binaries or stuff
if you need to in custom extras.
