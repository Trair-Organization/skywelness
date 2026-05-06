import UIKit
import UserNotifications
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "RezidansFitness",
      in: window,
      launchOptions: launchOptions
    )
    requestNotificationPermission()

    return true
  }

  private func requestNotificationPermission() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { _, _ in
      // No-op: iOS handles prompt lifecycle and system state.
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  /// Must match `server.port` in `mobile/metro.config.js`.
  private static let metroPort = 8082

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Simulator: always use Mac loopback + Metro port. Using `localhost` / URLComponents
    // from RCTBundleURLProvider can yield URLs that never reach Metro → blank white screen.
    #if targetEnvironment(simulator)
    return Self.simulatorMetroBundleURL()
    #else
    let provider = RCTBundleURLProvider.sharedSettings()
    guard let fromProvider = provider.jsBundleURL(forBundleRoot: "index") else {
      return Self.debugBundleURL(host: "127.0.0.1")
    }
    var parts = URLComponents(url: fromProvider, resolvingAgainstBaseURL: false)
    parts?.port = Self.metroPort
    return parts?.url ?? Self.debugBundleURL(host: fromProvider.host ?? "127.0.0.1")
    #endif
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

#if DEBUG
  private static func simulatorMetroBundleURL() -> URL? {
    URL(
      string:
        "http://127.0.0.1:\(Self.metroPort)/index.bundle?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true",
    )
  }

  private static func debugBundleURL(host: String) -> URL? {
    URL(
      string:
        "http://\(host):\(Self.metroPort)/index.bundle?platform=ios&dev=true&minify=false&modulesOnly=false&runModule=true",
    )
  }
#endif
}
