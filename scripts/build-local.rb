# Compatibility shim for the installed GitHub Pages gems on Ruby 3.2.
class Object
  def tainted?; false; end
  def untaint; self; end
end
load Gem.bin_path('jekyll', 'jekyll')
