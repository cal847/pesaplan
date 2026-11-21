import ExpoModulesCore
import ExpoUI

public class SmsReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmsReader")

    Events("onChange")

    Constant("PI") {
      Double.pi
    }

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }

    View(SmsReaderView.self) {
      Events("onTap")
    }

    Class(SmsReaderModuleSharedObject.self) {
      Constructor { () -> SmsReaderModuleSharedObject in
        return SmsReaderModuleSharedObject()
      }

      Property("count") { (ref: SmsReaderModuleSharedObject) -> Int in
        return ref.count
      }
      .set { (ref: SmsReaderModuleSharedObject, count: Int) in
        ref.count = count
      }
    }

    ExpoUIView(SmsReaderSwiftUIView.self)

    OnCreate {
      ViewModifierRegistry.register("smsReaderSwiftUIModifier") { params, appContext, _ in
        return try SmsReaderSwiftUIModifier(from: params, appContext: appContext)
      }
    }

    OnDestroy {
      ViewModifierRegistry.unregister("smsReaderSwiftUIModifier")
    }
  }
}
