package expo.modules.smsreader

import android.util.Log
import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.Telephony
import android.telephony.SubscriptionManager
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.provider.BaseColumns

class SmsReaderModule : Module() {

  init {
    Log.d("SmsInboxModule", "Initialised")
  }
  override fun definition() = ModuleDefinition {
    Name("SmsReader")

    // Messages from sender(MPESA), oldest first, strictly after the (date, id) cursor.
    AsyncFunction("readInbox") { afterDate: Double, afterId: Double, limit: Int ->
      readInbox(afterDate.toLong(), afterId.toLong(), limit)
    }

    AsyncFunction("getSimInfo") {
      getSimInfo()
    }
  }

  private val context: Context
    get() = appContext.reactContext
      ?: throw CodedException("E_NO_CONTEXT", "React context is not available", null)

  private fun granted(permission: String) =
    context.checkSelfPermission(permission) == PackageManager.PERMISSION_GRANTED

  /** subscription id -> 1-based SIM slot. Empty when READ_PHONE_STATE is missing. */
  private fun slotBySubscription(): Map<Int, Int> {
    if (!granted(Manifest.permission.READ_PHONE_STATE)) return emptyMap()
    val manager = context.getSystemService(SubscriptionManager::class.java) ?: return emptyMap()
    val infos = try {
      manager.activeSubscriptionInfoList
    } catch (e: SecurityException) {
      null
    }
    // -1 is for eSim(unknown), 0 for SIM 1 and 1 for SIM 2
    return infos?.associate { it.subscriptionId to it.simSlotIndex } ?: emptyMap()
  }

  private fun getSimInfo(): List<Map<String, Any?>> {
    if (!granted(Manifest.permission.READ_PHONE_STATE)) return emptyList()
    val manager = context.getSystemService(SubscriptionManager::class.java) ?: return emptyList()
    val infos = try {
      manager.activeSubscriptionInfoList
    } catch (e: SecurityException) {
      null
    } ?: return emptyList()
    return infos.map {
      mapOf(
        "slot" to it.simSlotIndex,
        "carrier" to it.carrierName?.toString(),
        "subscriptionId" to it.subscriptionId,
      )
    }
  }

  private fun readInbox(
    afterDate: Long,
    afterId: Long,
    limit: Int,
  ): List<Map<String, Any?>> {
    if (!granted(Manifest.permission.READ_SMS)) {
      throw CodedException("E_NO_PERMISSION", "READ_SMS has not been granted", null)
    }

    val slots = slotBySubscription()
    val resolver = context.contentResolver
    val uri = Telephony.Sms.Inbox.CONTENT_URI
 
    // Fetch inbox with MPESA
    val selection = "(date > ? OR (date = ? AND _id > ?)) AND address = ?"
    val args = arrayOf(
        afterDate.toString(), 
        afterDate.toString(), 
        afterId.toString(), 
        "MPESA" 
    )
    val order = "date ASC, _id ASC"

    val withSub = arrayOf(
        BaseColumns._ID,
        Telephony.TextBasedSmsColumns.ADDRESS,
        Telephony.TextBasedSmsColumns.BODY,
        Telephony.TextBasedSmsColumns.DATE,
        Telephony.TextBasedSmsColumns.SUBSCRIPTION_ID,
    )
    val withoutSub = arrayOf("_id", "address", "body", "date")

    // A few devices have no sub_id column; fall back and report the slot as unknown
    val cursor = try {
      resolver.query(uri, withSub, selection, args, order)
    } catch (e: IllegalArgumentException) {
      resolver.query(uri, withoutSub, selection, args, order)
    }

    val out = ArrayList<Map<String, Any?>>()
    cursor?.use { c ->
      val idIdx = c.getColumnIndexOrThrow("_id")
      val addressIdx = c.getColumnIndexOrThrow("address")
      val bodyIdx = c.getColumnIndexOrThrow("body")
      val dateIdx = c.getColumnIndexOrThrow("date")
      val subIdx = c.getColumnIndex("sub_id")

      // Stop as soon as we have a full page; the cursor is lazy
      while (out.size < limit && c.moveToNext()) {
        val address = c.getString(addressIdx) ?: ""
        val subId = if (subIdx >= 0 && !c.isNull(subIdx)) c.getInt(subIdx) else -1
        out.add(
          mapOf(
            "id" to c.getLong(idIdx),
            "date" to c.getLong(dateIdx),
            "address" to address,
            "body" to (c.getString(bodyIdx) ?: ""),
            "simSlot" to (slots[subId] ?: -1),
          )
        )
      }
    }
    return out
  }
}