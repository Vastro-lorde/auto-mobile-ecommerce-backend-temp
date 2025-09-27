const formatParticipant = (participantDoc) => {
  if (!participantDoc) {
    return null;
  }

  if (typeof participantDoc === 'string') {
    return {
      id: participantDoc,
      email: null,
      displayName: null,
      fullName: null,
      avatar: null,
      role: null
    };
  }

  const participant = participantDoc.toObject
    ? participantDoc.toObject({ virtuals: true })
    : participantDoc;

  const avatar = participant.profile?.avatar || participant.googlePicture || null;
  const displayName = participant.displayName || participant.fullName || participant.email || null;

  return {
    id: participant._id?.toString() || null,
    email: participant.email || null,
    displayName,
    fullName: participant.fullName || null,
    avatar,
    role: participant.role || null
  };
};

const formatMessage = (messageDoc, readSet, currentUserId) => {
  const message = messageDoc.toObject
    ? messageDoc.toObject({ virtuals: true })
    : messageDoc;

  const senderId = message.sender?._id
    ? message.sender._id.toString()
    : message.sender?.toString?.() || null;

  const messageId = message._id?.toString?.() || message.id?.toString?.() || null;

  return {
    id: messageId,
    conversation: message.conversation?.toString?.() || null,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    sender: formatParticipant(messageDoc.sender),
    isRead: senderId === currentUserId || readSet.has(messageId)
  };
};

module.exports = {
  formatParticipant,
  formatMessage
};
