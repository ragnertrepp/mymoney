# RF Vaade Android — private beta build (GPL-3.0)

This is an independent test derivative of [CIS-C0/RFSentinel](https://github.com/CIS-C0/RFSentinel), GPL-3.0, based on commit `4cc1aec3cd821b3c6ca518bcb851e94e19662012` (2026-10-29).

It downloads the public original source during CI, applies only launcher/Quick Settings name and five Estonian/Finnish resource translations, and builds a debug APK using the project's `foss` flavor. It does **not** add Estonian/Finnish police-specific device signatures or prove police presence.

## Build

The workflow `.github/workflows/rf-vaade-android.yml` builds on changes to branch `rf-vaade-build-2026`, uploading a test APK plus the full corresponding GPL source code as downloadable Actions artifacts. GitHub Actions may require approval or fail on third-party dependencies; check the build logs.

The APK is signed using the Android debug key generated in GitHub CI, suitable **only for testing**. A local Android SDK build can be done by cloning the upstream repo, running `python3 rfvaade/scripts/prepare.py <upstream-dir>`, then `./gradlew -Prfs.foss=true assembleFossDebug` inside the upstream directory.

## Important

Android Bluetooth and WiFi scanning only observes public signals. It cannot identify all police vehicles, cannot directly receive LIDAR/traffic radar with WiFi/Bluetooth, and will have false positives and negatives. Use while stationary and respect local law. This derivative is not endorsed by CIS-C0 and retains their copyright notices.
