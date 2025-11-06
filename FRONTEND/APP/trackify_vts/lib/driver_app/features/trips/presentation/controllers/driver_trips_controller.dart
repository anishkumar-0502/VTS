import 'package:get/get.dart';

class DriverTripsController extends GetxController {
  final List<Map<String, dynamic>> todayTrips = [
    {
      'title': 'Morning pickup',
      'status': 'Scheduled',
      'startTime': '07:15 AM',
      'endTime': '08:20 AM',
      'students': '24 students',
      'route': 'Morning Route A',
    },
    {
      'title': 'Afternoon drop',
      'status': 'Scheduled',
      'startTime': '02:15 PM',
      'endTime': '03:10 PM',
      'students': '24 students',
      'route': 'Afternoon Route B',
    },
  ];

  final List<Map<String, String>> tripHistory = [
    {
      'date': 'Oct 26',
      'summary': 'Morning Route A completed',
      'duration': '47 mins',
    },
    {
      'date': 'Oct 25',
      'summary': 'Afternoon Route B completed',
      'duration': '49 mins',
    },
    {
      'date': 'Oct 24',
      'summary': 'Morning Route A completed',
      'duration': '46 mins',
    },
  ];

  final RxBool sosExpanded = false.obs;

  void toggleSos() {
    sosExpanded.toggle();
  }
}
