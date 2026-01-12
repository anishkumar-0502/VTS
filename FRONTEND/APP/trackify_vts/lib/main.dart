import 'driver_app/main_driver.dart' as driver;
import 'parent_app/main_parent.dart' as parent;

void main() {
  const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'driver');
  
  if (flavor == 'parent') {
    parent.main();
  } else if (flavor == 'dev') {
    driver.main();
  } else {
    driver.main();
  }
}
