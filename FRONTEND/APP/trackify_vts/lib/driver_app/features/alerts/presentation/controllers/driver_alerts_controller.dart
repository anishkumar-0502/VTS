import 'package:get/get.dart';

class DriverAlertsController extends GetxController {
  final List<Map<String, String>> recentAlerts = [
    {
      'title': 'Weather advisory',
      'body': 'Light rain expected around 08:15 AM. Drive cautiously.',
      'time': '5 mins ago',
      'type': 'info',
    },
    {
      'title': 'Route update',
      'body': 'Pine Avenue pickup shifted to 07:45 AM due to road works.',
      'time': '15 mins ago',
      'type': 'update',
    },
    {
      'title': 'Maintenance reminder',
      'body': 'Log vehicle inspection report before Nov 12.',
      'time': 'Yesterday',
      'type': 'reminder',
    },
  ];

  final List<Map<String, String>> quickContacts = [
    {
      'name': 'Transport desk',
      'role': 'School admin',
      'phone': '+1 555 884 122',
    },
    {
      'name': 'Safety officer',
      'role': 'Emergency lead',
      'phone': '+1 555 204 880',
    },
    {
      'name': 'Mechanic support',
      'role': 'Vehicle service',
      'phone': '+1 555 190 333',
    },
  ];
}
