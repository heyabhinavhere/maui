cask "maui" do
  version "1.0.0"
  sha256 "1363408c28ca5dd32c7de4f1e6c7b11173db3a022be724050a35f3d6514dcf36"

  url "https://github.com/heyabhinavhere/maui/releases/download/v#{version}/Maui-#{version}.dmg"
  name "Maui"
  desc "Notch app for screenshots, files, coding agents and pull requests"
  homepage "https://heyabhinavhere.github.io/maui/"

  livecheck do
    url "https://heyabhinavhere.github.io/maui/appcast.xml"
    strategy :sparkle, &:short_version
  end

  auto_updates true
  depends_on arch: :arm64
  depends_on macos: :tahoe

  app "Maui.app"

  uninstall quit:       "com.abhinavjain.Island",
            login_item: "Maui"

  zap trash: [
    "~/Library/Application Support/Island",
    "~/Library/Caches/com.abhinavjain.Island",
    "~/Library/HTTPStorages/com.abhinavjain.Island",
    "~/Library/Preferences/com.abhinavjain.Island.plist",
  ]
end
