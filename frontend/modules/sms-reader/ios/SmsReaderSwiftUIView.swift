import SwiftUI
import ExpoModulesCore
import ExpoUI

final class SmsReaderSwiftUIViewProps: UIBaseViewProps {
  @Field var title: String = ""
}

struct SmsReaderSwiftUIView: ExpoSwiftUI.View {
  @ObservedObject public var props: SmsReaderSwiftUIViewProps

  var body: some View {
    VStack {
      Text(props.title)
        .font(.headline)
      Children()
    }
  }
}
