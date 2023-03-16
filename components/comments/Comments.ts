import "./comments.scss";
import Mustache from "mustache";

export default class Comments {
  commentsEl = document.getElementById("comments")!;
  commentCountEl = document.getElementById("comment-count")!;
  commentFormEl = document.getElementById("comment-form")!;
  commentFormThanksEl = document.getElementById("comment-form-thanks-message")!;
  template = document.getElementById("comment-template")!.innerHTML;

  constructor() {
    // TODO: add loading animation
    // TODO: only show comment form once per day
    this.loadComments();
    this.commentFormEl.addEventListener("submit", this.onSubmit.bind(this));
  }

  onSubmit(e: any) {
    e.preventDefault();
    const formData = new FormData(e.target);

    // TODO: min num words validation
    // TODO: max num words validation
    // TODO: max char validation

    this.submitComment(formData).then((response) => {
      console.log("response", response);
      const commentHTML = this.commentHTML(
        response.name,
        response.comment,
        response.created
      );

      this.commentsEl.insertAdjacentHTML("afterbegin", commentHTML);
      // TODO: update comment count

      this.animateForm();
    });
  }

  animateForm() {
    this.commentFormEl.addEventListener("animationend", (e) => {
      console.log("animationend");
      this.commentFormEl.style.visibility = "hidden";
      this.commentFormThanksEl.classList.add("display");
    });

    this.commentFormEl.classList.add("submitted");
  }

  async submitComment(data: FormData) {
    const response = await fetch("http://localhost:8080/comments/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Object.fromEntries(data.entries())),
    });
    return response.json();
  }

  loadComments() {
    fetch("http://localhost:8080/comments/")
      .then((response) => response.json())
      .then((data) => {
        this.commentsEl.innerText = "";
        this.commentCountEl.innerText = data.length;

        let commentsHTML = "";
        data.forEach((comment: any) => {
          commentsHTML += this.commentHTML(
            comment.name,
            comment.comment,
            comment.created
          );
        });

        this.commentsEl.innerHTML = commentsHTML;
      });
  }

  commentHTML(name: string, comment: string, created: string) {
    return Mustache.render(this.template, {
      name: name,
      comment: comment,
      created: created,
    });
  }
}
