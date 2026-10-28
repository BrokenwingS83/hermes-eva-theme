Media supplied locally

This folder is where you put the assets the plugin references. Nothing here is
committed: `media-src/*` is gitignored, because these files are third-party
material (see ../NOTICE). The build reads a file from here if it exists, and
otherwise falls back to the upstream checkout in `vendor/`.

Layout and exact file names (10 files, about 3.0 MB):

    svg/nerv-emergency.svg
    anim/nerv-boot.gif
    art/asuka-avatar-closed-eyes.png
    art/rei-avatar-closed-eyes.png
    voice/asuka-voice-select.mp3
    voice/asuka-voice-boot.mp3
    voice/asuka-voice-welcome.mp3
    voice/rei-voice-select.mp3
    voice/rei-voice-boot.mp3
    voice/rei-voice-welcome.mp3

Two upstream files, `svg/nerv-logo.svg` and `svg/eva-entry-plug.svg`, are not
used by this port and are not required; skip them.

The files that matter for behaviour:

- `anim/nerv-boot.gif` is the first frame of the boot sequence. Any square GIF
  works; the overlay sizes it to 62vh.
- `art/*-avatar-closed-eyes.png` are the two pilot cards. The plugin displays
  them at card width, so roughly 600 px wide is enough; a 1254 px image was
  used during development.
- `voice/*-select.mp3` is played when the pilot is chosen, `*-boot.mp3` while
  the plug sync bar runs (its duration sets the bar's pace), `*-welcome.mp3`
  after the doors open.
- `svg/nerv-emergency.svg` is the alarm stage; any wide red graphic works.

Missing files do not crash the plugin: the boot overlay logs the failure in its
trace and continues, and the MAGI pane does not use media at all. What breaks is
the visual, not the app.

To rebuild from the upstream checkout instead of supplying files by hand:

    git clone https://github.com/seaison/dsh-plugin-eva-theme vendor/dsh-plugin-eva-theme
    node build/build.mjs

Then the media is copied out of `vendor/` into `plugin/media/` (also gitignored,
also local-only).
