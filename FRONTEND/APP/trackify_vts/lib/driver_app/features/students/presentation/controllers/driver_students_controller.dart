import 'package:get/get.dart';

class DriverStudentsController extends GetxController {
  final RxList<Map<String, dynamic>> manifest = <Map<String, dynamic>>[
    {
      'name': 'Ava Thompson',
      'grade': 'Grade 4',
      'pickup': true,
      'drop': false,
      'guardian': 'Linda Thompson',
    },
    {
      'name': 'Ethan Brooks',
      'grade': 'Grade 3',
      'pickup': false,
      'drop': false,
      'guardian': 'Mark Brooks',
    },
    {
      'name': 'Sofia Patel',
      'grade': 'Grade 2',
      'pickup': false,
      'drop': false,
      'guardian': 'Anika Patel',
    },
    {
      'name': 'Lucas Rivera',
      'grade': 'Grade 5',
      'pickup': false,
      'drop': false,
      'guardian': 'Carlos Rivera',
    },
  ].obs;

  final RxList<Map<String, String>> syncQueue = <Map<String, String>>[].obs;

  void togglePickup(int index, bool value) {
    manifest[index]['pickup'] = value;
    manifest.refresh();
    queueSync(manifest[index]['name'], value ? 'Picked up' : 'Pickup pending');
  }

  void toggleDrop(int index, bool value) {
    manifest[index]['drop'] = value;
    manifest.refresh();
    queueSync(manifest[index]['name'], value ? 'Dropped off' : 'Drop pending');
  }

  void queueSync(String student, String status) {
    syncQueue.add({'student': student, 'status': status});
  }

  void clearQueue() {
    syncQueue.clear();
  }
}
