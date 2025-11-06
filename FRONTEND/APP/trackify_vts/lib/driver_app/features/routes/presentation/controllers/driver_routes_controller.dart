import 'package:get/get.dart';

class DriverRoutesController extends GetxController {
  final RxInt selectedRouteIndex = 0.obs;

  final List<Map<String, dynamic>> assignedRoutes = [
    {
      'name': 'Morning Route A',
      'start': 'Depot',
      'end': 'Greenwood High',
      'distance': '14.2 km',
      'duration': '45 mins',
      'stops': [
        {'name': 'Maple Street', 'time': '07:40 AM'},
        {'name': 'Pine Avenue', 'time': '07:48 AM'},
        {'name': 'Oak Crescent', 'time': '07:55 AM'},
        {'name': 'Cedar Lane', 'time': '08:05 AM'},
      ],
    },
    {
      'name': 'Afternoon Route B',
      'start': 'Greenwood High',
      'end': 'Depot',
      'distance': '15.0 km',
      'duration': '50 mins',
      'stops': [
        {'name': 'Cedar Lane', 'time': '02:25 PM'},
        {'name': 'Oak Crescent', 'time': '02:35 PM'},
        {'name': 'Pine Avenue', 'time': '02:45 PM'},
        {'name': 'Maple Street', 'time': '02:55 PM'},
      ],
    },
  ];

  final List<Map<String, String>> routeHighlights = [
    {'label': 'Traffic status', 'value': 'Light'},
    {'label': 'Weather', 'value': 'Clear skies'},
    {'label': 'Next inspection', 'value': 'Nov 12'},
  ];

  void selectRoute(int index) {
    selectedRouteIndex.value = index;
  }
}
