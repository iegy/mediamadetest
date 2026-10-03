// new Date().toISOString() بيرجّع التاريخ بتوقيت UTC، مش توقيت جهاز المستخدم — فلو حد فاتح
// النظام بعد نص الليل بتوقيت القاهرة (اللي بيبقى لسه قبل منتصف الليل بتوقيت UTC)، "النهاردة"
// هتظهر غلط (يوم اللي فات). الدالة دي بتستخدم توقيت الجهاز المحلي بدل كده.
export function localDateIso(d) {
  const date = d || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
